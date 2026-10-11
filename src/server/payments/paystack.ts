import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

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

/** Verification is unavailable or inconclusive; webhook delivery must retry. */
export class PaymentVerificationUnavailableError extends Error {}

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
  if (!resp.ok) {
    throw new PaymentVerificationUnavailableError(`Paystack verification HTTP ${resp.status}`);
  }
  const payload = z.object({
    status: z.literal(true),
    message: z.string().optional(),
    data: z.object({
      status: z.string().min(1),
      amount: z.number().int().nonnegative(),
      reference: z.string().min(1),
    }),
  }).safeParse(await resp.json().catch(() => null));
  if (!payload.success) {
    throw new PaymentVerificationUnavailableError("Invalid Paystack verification response");
  }
  return {
    ok: true,
    status: payload.data.data.status,
    amount: payload.data.data.amount,
    reference: payload.data.data.reference,
    message: payload.data.message,
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
  const cancelledPaymentNotice = {
    tenantId: tenant.id,
    type: "ORDER_NEEDS_ATTENTION",
    title: `Payment received for cancelled order #${orderNumber(order.id)}`,
    message: `Paystack ref ${reference}. Contact ${order.customerName ?? "the customer"}${order.customerPhone ? ` (${order.customerPhone})` : ""} to fulfil or refund.`,
    data: { orderId: order.id, reference },
  };
  if (decision.action === "retry") {
    throw new PaymentVerificationUnavailableError(decision.reason);
  }

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
    await db.insert(adminNotifications).values(cancelledPaymentNotice);
    return { ...base, outcome: "needs_attention" };
  }

  const result = await db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(orders)
      .set({ status: "COMPLETED" })
      .where(and(eq(orders.id, order.id), eq(orders.tenantId, tenant.id), eq(orders.status, "PENDING")))
      .returning({ id: orders.id });

    if (!claimed) {
      // Cancellation/expiry can win while verification is in flight. Only
      // another successful finalization may be reported as already completed.
      const current = await tx.query.orders.findFirst({
        where: and(eq(orders.id, order.id), eq(orders.tenantId, tenant.id)),
        columns: { status: true },
      });
      if (current?.status === "CANCELLED") {
        await tx.insert(adminNotifications).values(cancelledPaymentNotice);
        return { outcome: "needs_attention" as const, shortfalls: [] as StockShortfall[] };
      }
      if (current?.status === "COMPLETED") {
        return { outcome: "already_completed" as const, shortfalls: [] as StockShortfall[] };
      }
      throw new PaymentVerificationUnavailableError("Order changed during payment finalization");
    }

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
    // Cancellation reads this durable evidence to avoid restoring quantities
    // that were never deducted. Commit it atomically with status and stock;
    // post-commit email/notification failures must not change stock accounting.
    if (shortfalls.length > 0) {
      await tx.insert(adminNotifications).values({
        tenantId: tenant.id,
        type: "ORDER_NEEDS_ATTENTION",
        title: `Order #${orderNumber(order.id)} paid but stock ran out`,
        message: `Not enough stock for: ${shortfalls.map((s) => `${s.name} (×${s.wanted})`).join(", ")}. Contact the customer to arrange a refund or substitute.`,
        data: { orderId: order.id, shortfalls },
      });
    }
    return { outcome: "completed" as const, shortfalls };
  });

  if (result.outcome !== "completed") return { ...base, outcome: result.outcome };

  await notifyOrderPlaced({ db, tenant, orderId: order.id });
  return {
    ...base,
    outcome: result.shortfalls.length > 0 ? "needs_attention" : "completed",
    shortfalls: result.shortfalls,
  };
}
