import { z } from "zod";
import { createTRPCRouter, managerProcedure } from "~/server/api/trpc";
import type { db as appDb } from "~/server/db";
import { adminNotifications, orders, products } from "~/server/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { manualStatusChangeError, stockEffectOfStatusChange } from "~/lib/domain/order-status";

type Transaction = Parameters<Parameters<typeof appDb.transaction>[0]>[0];

/**
 * Products the Paystack finalizer could not decrement for this order (stock
 * ran out between checkout and payment). The finalizer records them only in
 * its ORDER_NEEDS_ATTENTION notification.
 */
async function paystackShortfallProductIds(tx: Transaction, tenantId: string, orderId: string) {
  const rows = await tx
    .select({ data: adminNotifications.data })
    .from(adminNotifications)
    .where(and(
      eq(adminNotifications.tenantId, tenantId),
      eq(adminNotifications.type, "ORDER_NEEDS_ATTENTION"),
      sql`${adminNotifications.data}->>'orderId' = ${orderId}`,
      sql`${adminNotifications.data}->'shortfalls' is not null`,
    ));
  const ids = new Set<string>();
  for (const row of rows) {
    const shortfalls = (row.data as { shortfalls?: { productId?: unknown }[] } | null)?.shortfalls;
    for (const shortfall of shortfalls ?? []) {
      if (typeof shortfall.productId === "string") ids.add(shortfall.productId);
    }
  }
  return ids;
}

/** PAYSTACK + PENDING = pre-created checkout, no payment yet (see order-status.ts). */
const awaitingPaymentSql = sql`(coalesce(${orders.paymentMethod}, '') = 'PAYSTACK' and ${orders.status} = 'PENDING')`;

export const ordersRouter = createTRPCRouter({
  list: managerProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(), // createdAt ISO
        // AWAITING_PAYMENT = Paystack checkouts not yet paid. They are left
        // out of "all" and "PENDING" so abandoned checkouts don't bury real orders.
        status: z.enum(["PENDING", "COMPLETED", "CANCELLED", "AWAITING_PAYMENT"]).optional(),
        deliveryMethod: z.enum(["PICKUP", "DELIVERY"]).optional(),
        paymentMethod: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereBase = and(
        eq(orders.tenantId, ctx.tenantId),
        input.status === "AWAITING_PAYMENT"
          ? awaitingPaymentSql
          : input.status
            ? and(eq(orders.status, input.status), sql`not ${awaitingPaymentSql}`)
            : sql`not ${awaitingPaymentSql}`,
        input.deliveryMethod ? eq(orders.deliveryMethod, input.deliveryMethod) : undefined,
        input.paymentMethod ? eq(orders.paymentMethod, input.paymentMethod) : undefined,
        input.cursor ? sql`${orders.createdAt} < ${new Date(input.cursor)}` : undefined,
      );

      const rows = await ctx.db.query.orders.findMany({
        where: whereBase,
        orderBy: desc(orders.createdAt),
        limit: input.limit + 1,
        with: {
          items: {
            with: {
              product: { columns: { name: true } },
            },
          },
          customer: true,
        },
      });

      const items = rows.slice(0, input.limit);
      const nextCursor =
        rows.length > input.limit
          ? items[items.length - 1]?.createdAt.toISOString()
          : undefined;

      return { items, nextCursor };
    }),

  get: managerProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const order = await ctx.db.query.orders.findFirst({
      where: and(eq(orders.id, input.id), eq(orders.tenantId, ctx.tenantId)),
      with: {
        items: {
          with: {
            product: true,
          },
        },
        customer: true,
      },
    });
    if (!order) return null;
    return order;
  }),

  updateStatus: managerProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId;
      await ctx.db.transaction(async (tx) => {
        const order = await tx.query.orders.findFirst({
          where: and(eq(orders.id, input.id), eq(orders.tenantId, tenantId)),
          columns: { id: true, status: true, paymentMethod: true, isHistoricalImport: true },
          with: { items: { columns: { productId: true, quantity: true } } },
        });
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        const blocked = manualStatusChangeError(order, input.status);
        if (blocked) throw new TRPCError({ code: "BAD_REQUEST", message: blocked });

        // Conditional on the status we checked, so a payment finalizing in the
        // meantime (PENDING -> COMPLETED) is not overwritten by a stale click.
        const [updated] = await tx
          .update(orders)
          .set({ status: input.status })
          .where(and(eq(orders.id, input.id), eq(orders.tenantId, tenantId), eq(orders.status, order.status)))
          .returning({ id: orders.id });
        if (!updated) {
          throw new TRPCError({ code: "CONFLICT", message: "The order changed while you were looking at it. Refresh and try again." });
        }

        // Only reached when this call actually moved the status, so stock
        // moves exactly once per transition. Like the sale paths, this only
        // touches products.stockQuantity (sales write no inventory movements).
        const effect = stockEffectOfStatusChange(order, input.status);
        if (effect === "none") return;

        const quantities = new Map<string, number>();
        for (const item of order.items) {
          quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
        }

        if (effect === "restore") {
          // A paid Paystack order whose stock ran out at finalize never had
          // those items decremented; don't add them back.
          if (order.paymentMethod === "PAYSTACK") {
            for (const productId of await paystackShortfallProductIds(tx, tenantId, order.id)) {
              quantities.delete(productId);
            }
          }
          for (const [productId, quantity] of quantities) {
            await tx
              .update(products)
              .set({
                // -1 = untracked stock: leave it alone.
                stockQuantity: sql`CASE WHEN ${products.stockQuantity} = -1 THEN -1 ELSE ${products.stockQuantity} + ${quantity} END`,
              })
              .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)));
          }
          return;
        }

        // Reopening a cancelled order takes its stock again.
        for (const [productId, quantity] of quantities) {
          const [taken] = await tx
            .update(products)
            .set({
              stockQuantity: sql`CASE WHEN ${products.stockQuantity} = -1 THEN -1 ELSE ${products.stockQuantity} - ${quantity} END`,
            })
            .where(and(
              eq(products.id, productId),
              eq(products.tenantId, tenantId),
              sql`(${products.stockQuantity} = -1 OR ${products.stockQuantity} >= ${quantity})`,
            ))
            .returning({ id: products.id });
          if (!taken) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "There isn't enough stock left to reopen this order. Adjust stock first.",
            });
          }
        }
      });
      return { success: true };
    }),
});




