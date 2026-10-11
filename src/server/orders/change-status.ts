import { TRPCError } from "@trpc/server";
import { and, eq, lte, sql } from "drizzle-orm";
import type { db as appDb } from "~/server/db";
import { adminNotifications, orders, products } from "~/server/db/schema";
import {
  manualStatusChangeError,
  stockEffectOfStatusChange,
  type OrderStatusValue,
} from "~/lib/domain/order-status";
import { pickupExpiresAt } from "~/lib/domain/pickup-reservation";

type Transaction = Parameters<Parameters<typeof appDb.transaction>[0]>[0];

/**
 * Products the Paystack finalizer could not decrement for this order (stock
 * ran out between checkout and payment). The finalizer persists this evidence
 * in its ORDER_NEEDS_ATTENTION record inside the status/stock transaction.
 */
async function paystackShortfallProductIds(
  tx: Transaction,
  tenantId: string,
  orderId: string,
) {
  const rows = await tx
    .select({ data: adminNotifications.data })
    .from(adminNotifications)
    .where(
      and(
        eq(adminNotifications.tenantId, tenantId),
        eq(adminNotifications.type, "ORDER_NEEDS_ATTENTION"),
        sql`${adminNotifications.data}->>'orderId' = ${orderId}`,
        sql`${adminNotifications.data}->'shortfalls' is not null`,
      ),
    );
  const ids = new Set<string>();
  for (const row of rows) {
    const shortfalls = (
      row.data as { shortfalls?: { productId?: unknown }[] } | null
    )?.shortfalls;
    for (const shortfall of shortfalls ?? []) {
      if (typeof shortfall.productId === "string") ids.add(shortfall.productId);
    }
  }
  return ids;
}

/** One transaction owns status and stock for manual cancellation, reopening and expiry. */
export async function changeOrderStatus(
  database: typeof appDb,
  tenantId: string,
  orderId: string,
  next: OrderStatusValue,
  expiryCutoff?: Date,
) {
  await database.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)),
      columns: {
        id: true,
        status: true,
        paymentMethod: true,
        isHistoricalImport: true,
        expiresAt: true,
      },
      with: { items: { columns: { productId: true, quantity: true } } },
    });
    if (!order)
      throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
    if (
      expiryCutoff &&
      (order.status !== "PENDING" ||
        !order.expiresAt ||
        order.expiresAt > expiryCutoff)
    )
      return;
    if (
      !expiryCutoff &&
      next === "COMPLETED" &&
      order.status === "PENDING" &&
      order.paymentMethod === "PAY_ON_PICKUP" &&
      order.expiresAt &&
      order.expiresAt <= new Date()
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "This pickup reservation expired. Refresh, then reopen it to reserve stock again.",
      });
    }
    if (order.status === next) return;
    const blocked = manualStatusChangeError(order, next);
    if (blocked) throw new TRPCError({ code: "BAD_REQUEST", message: blocked });

    // Conditional on the status we checked, so a payment finalizing in the
    // meantime (PENDING -> COMPLETED) is not overwritten by a stale click.
    const [updated] = await tx
      .update(orders)
      .set({
        status: next,
        cancellationReason:
          next === "CANCELLED"
            ? expiryCutoff
              ? "RESERVATION_EXPIRED"
              : "STAFF_CANCELLED"
            : null,
        expiresAt:
          next === "PENDING" && order.paymentMethod === "PAY_ON_PICKUP"
            ? pickupExpiresAt()
            : order.expiresAt,
      })
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.tenantId, tenantId),
          eq(orders.status, order.status),
          expiryCutoff ? lte(orders.expiresAt, expiryCutoff) : undefined,
        ),
      )
      .returning({ id: orders.id });
    if (!updated) {
      if (expiryCutoff) return;
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "The order changed while you were looking at it. Refresh and try again.",
      });
    }

    // Only reached when this call actually moved the status, so stock
    // moves exactly once per transition. Like the sale paths, this only
    // touches products.stockQuantity (sales write no inventory movements).
    const effect = stockEffectOfStatusChange(order, next);
    if (effect === "none") return;

    const quantities = new Map<string, number>();
    for (const item of order.items) {
      quantities.set(
        item.productId,
        (quantities.get(item.productId) ?? 0) + item.quantity,
      );
    }

    if (effect === "restore") {
      // A paid Paystack order whose stock ran out at finalize never had
      // those items decremented; don't add them back.
      if (order.paymentMethod === "PAYSTACK") {
        for (const productId of await paystackShortfallProductIds(
          tx,
          tenantId,
          order.id,
        )) {
          quantities.delete(productId);
        }
      }
      for (const [productId, quantity] of [...quantities].sort(([a], [b]) =>
        a.localeCompare(b),
      )) {
        await tx
          .update(products)
          .set({
            // -1 = untracked stock: leave it alone.
            stockQuantity: sql`CASE WHEN ${products.stockQuantity} = -1 THEN -1 ELSE ${products.stockQuantity} + ${quantity} END`,
          })
          .where(
            and(eq(products.id, productId), eq(products.tenantId, tenantId)),
          );
      }
      return;
    }

    // Reopening a cancelled order takes its stock again.
    for (const [productId, quantity] of [...quantities].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const [taken] = await tx
        .update(products)
        .set({
          stockQuantity: sql`CASE WHEN ${products.stockQuantity} = -1 THEN -1 ELSE ${products.stockQuantity} - ${quantity} END`,
        })
        .where(
          and(
            eq(products.id, productId),
            eq(products.tenantId, tenantId),
            sql`(${products.stockQuantity} = -1 OR ${products.stockQuantity} >= ${quantity})`,
          ),
        )
        .returning({ id: products.id });
      if (!taken) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "There isn't enough stock left to reopen this order. Adjust stock first.",
        });
      }
    }
  });
}
