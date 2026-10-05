import { eq } from "drizzle-orm";

import { verifyPaystackSignature } from "~/lib/domain/paystack";
import { db } from "~/server/db";
import { orders, tenants } from "~/server/db/schema";
import {
  finalizePaystackOrder,
  PaymentNotFoundError,
  PaymentVerificationError,
  tenantPaystackSecret,
} from "~/server/payments/paystack";

export const dynamic = "force-dynamic";

/**
 * Paystack webhook — a backstop for shoppers whose browser closed after
 * paying. The client-side verify in `shop.createOrder` stays primary; both
 * end in the same idempotent `finalizePaystackOrder`.
 *
 * Set in the Paystack dashboard: https://www.sppdamaks.com/api/paystack/webhook
 */
export async function POST(request: Request) {
  // The signature covers the exact bytes Paystack sent, so read raw text.
  const rawBody = await request.text();

  let event: { event?: string; data?: { reference?: unknown } };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const reference =
    typeof event.data?.reference === "string" ? event.data.reference : null;
  if (!reference) return new Response("Unauthorized", { status: 401 });

  // The tenant comes from our own order row, never from event metadata. An
  // unknown reference can't be verified, so it gets the same 401 as a bad
  // signature (no hint about which references exist).
  const order = await db.query.orders.findFirst({
    where: eq(orders.paymentReference, reference),
    columns: { tenantId: true },
  });
  const tenant = order
    ? await db.query.tenants.findFirst({ where: eq(tenants.id, order.tenantId) })
    : null;
  const secretKey = tenant ? tenantPaystackSecret(tenant) : null;

  if (
    !tenant ||
    !verifyPaystackSignature(
      rawBody,
      request.headers.get("x-paystack-signature"),
      secretKey,
    )
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (event.event !== "charge.success") {
    return Response.json({ received: true });
  }

  try {
    const result = await finalizePaystackOrder({ db, tenant, reference });
    return Response.json({ received: true, outcome: result.outcome });
  } catch (error) {
    if (
      error instanceof PaymentVerificationError ||
      error instanceof PaymentNotFoundError
    ) {
      // Retrying won't change Paystack's answer; acknowledge and log.
      console.error(`[paystack webhook] ref=${reference}: ${error.message}`);
      return Response.json({ received: true, outcome: "rejected" });
    }
    // Transient (network/DB): a 5xx makes Paystack retry later.
    console.error(`[paystack webhook] ref=${reference} failed:`, error);
    return new Response("Error", { status: 500 });
  }
}
