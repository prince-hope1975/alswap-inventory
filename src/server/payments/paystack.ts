import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { orderNumber } from "~/lib/domain/checkout";
import { decideFinalization, type PaystackVerification } from "~/lib/domain/paystack";
import type { db as appDb } from "~/server/db";
import { adminNotifications, orders, products, type tenants } from "~/server/db/schema";
import { notifyOrderPlaced, type StockShortfall } from "~/server/orders/notify";
import { decryptString } from "~/server/utils/encryption";

type Database = typeof appDb;
type Tenant = typeof tenants.$inferSelect;

const PAYSTACK_API = "https://api.paystack.co";

/** Raised when Paystack says the payment didn't happen or doesn't match the order. */
export class PaymentVerificationError extends Error {}

/** Raised for unknown orders / unconfigured stores. */
export class PaymentNotFoundError extends Error {}

export function tenantPaystackSecret(tenant: Pick<Tenant, "paystackSecretKey">) {
  return tenant.paystackSecretKey ? decryptString(tenant.paystackSecretKey) : null;
}

export async function initializePaystackTransaction(input: {
  secretKey: string;
  email: string;
  amountKobo: number;
  reference: string;
  metadata: Record<string, unknown>;
}) {
  const resp = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.secretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      reference: input.reference,
      metadata: input.metadata,
    }),
  });

  const payload = (await resp.json().catch(() => ({ status: false }))) as {
    status: boolean;
    message?: string;
    data?: { access_code: string; reference: string };
  };

  if (!resp.ok || !payload.status || !payload.data?.access_code) {
    return { ok: false as const, message: payload.message ?? "Failed to initialize Paystack transaction." };
  }
  return { ok: true as const, accessCode: payload.data.access_code };
}

export async function verifyPaystackTransaction(
  secretKey: string,
  reference: string,
): Promise<PaystackVerification> {
  const resp = await fetch(
    `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secretKey}`, Accept: "application/json" } },
  );
  const payload = (await resp.json().catch(() => ({ status: false }))) as {
    status: boolean;
    message?: string;
    data?: { status?: string; amount?: number; reference?: string };
  };
  return {
    ok: resp.ok && payload.status,
    status: payload.data?.status,
    amount: payload.data?.amount,
    reference: payload.data?.reference,
    message: payload.message,
  };
}

export type FinalizeResult = {
  orderId: string;
  totalAmount: string;
  /** "completed" only for the one caller that moved the order out of PENDING. */
  outcome: "completed" | "already_completed" | "needs_attention";
  shortfalls: StockShortfall[];
};

/**
 * Complete a PENDING storefront order once Paystack confirms payment.
 *
 * Shared by the client-side verify (`shop.createOrder`) and the webhook.
 * Idempotent: the status update is conditional on PENDING, so a replay or a
 * race between the two callers completes, decrements stock and notifies
 * exactly once. Stock that ran out between checkout and payment never fails
 * the customer — the paid order is kept and staff are told to follow up.
 */
export async function finalizePaystackOrder(input: {
  db: Database;
  tenant: Tenant;
  reference: string;
}): Promise<FinalizeResult> {
  const { db, tenant, reference } = input;

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.tenantId, tenant.id), eq(orders.paymentReference, reference)),
    with: { items: { with: { product: { columns: { name: true } } } } },
  });
  if (!order) throw new PaymentNotFoundError("Order not found for this payment reference.");

  const base = { orderId: order.id, totalAmount: order.totalAmount, shortfalls: [] };
  if (order.status === "COMPLETED") return { ...base, outcome: "already_completed" };

  const secretKey = tenantPaystackSecret(tenant);
  if (!secretKey) throw new PaymentNotFoundError("Paystack is not configured for this store.");

  // Network call stays outside the transaction.
  const verification = await verifyPaystackTransaction(secretKey, reference);
  const decision = decideFinalization({
    orderStatus: order.status,
    orderTotal: order.totalAmount,
    reference,
    verification,
  });

  if (decision.action === "already_completed") {
    return { ...base, outcome: "already_completed" };
  }
  if (decision.action === "reject") {
    // Paystack says the money arrived but it doesn't match this order: staff
    // must hear about it, not only the customer.
    if (verification.ok && verification.status === "success") {
      await db.insert(adminNotifications).values({
        tenantId: tenant.id,
        type: "ORDER_NEEDS_ATTENTION",
        title: `Payment for order #${orderNumber(order.id)} could not be matched`,
        message: `${decision.reason} Paystack ref ${reference}. Check the Paystack dashboard and contact ${order.customerName ?? "the customer"}${order.customerPhone ? ` (${order.customerPhone})` : ""}.`,
        data: { orderId: order.id, reference, paidKobo: verification.amount },
      }).catch((error: unknown) => console.error("Failed to record payment mismatch:", error));
    }
    throw new PaymentVerificationError(decision.reason);
  }
  if (decision.action === "needs_attention") {
    console.error(`[paystack] ${decision.reason} order=${order.id} ref=${reference}`);
    await db.insert(adminNotifications).values({
      tenantId: tenant.id,
      type: "ORDER_NEEDS_ATTENTION",
      title: `Payment received for cancelled order #${orderNumber(order.id)}`,
      message: `Paystack ref ${reference}. Contact ${order.customerName ?? "the customer"}${order.customerPhone ? ` (${order.customerPhone})` : ""} to fulfil or refund.`,
      data: { orderId: order.id, reference },
    });
    return { ...base, outcome: "needs_attention" };
  }

  const result = await db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(orders)
      .set({ status: "COMPLETED" })
      .where(and(eq(orders.id, order.id), eq(orders.status, "PENDING")))
      .returning({ id: orders.id });

    // Someone else (webhook vs client) got here first.
    if (!claimed) return { claimed: false, shortfalls: [] as StockShortfall[] };

    const shortfalls: StockShortfall[] = [];
    for (const item of order.items) {
      // -1 means untracked stock: leave it alone. Otherwise only decrement
      // when there's enough, and record what couldn't be covered.
      const [updated] = await tx
        .update(products)
        .set({
          stockQuantity: sql`CASE WHEN ${products.stockQuantity} = -1 THEN -1 ELSE ${products.stockQuantity} - ${item.quantity} END`,
        })
        .where(
          and(
            eq(products.id, item.productId),
            eq(products.tenantId, tenant.id),
            sql`(${products.stockQuantity} = -1 OR ${products.stockQuantity} >= ${item.quantity})`,
          ),
        )
        .returning({ id: products.id });
      if (!updated) {
        shortfalls.push({
          productId: item.productId,
          name: item.product?.name ?? "Item",
          wanted: item.quantity,
        });
      }
    }
    return { claimed: true, shortfalls };
  });

  if (!result.claimed) return { ...base, outcome: "already_completed" };

  await notifyOrderPlaced({ db, tenant, orderId: order.id, shortfalls: result.shortfalls });
  return {
    ...base,
    outcome: result.shortfalls.length > 0 ? "needs_attention" : "completed",
    shortfalls: result.shortfalls,
  };
}
