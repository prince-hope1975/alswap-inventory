import { z } from "zod";
import { createTRPCRouter, managerProcedure, staffProcedure } from "~/server/api/trpc";
import type { db as appDb } from "~/server/db";
import { adminNotifications, customers, orders, products } from "~/server/db/schema";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { manualStatusChangeError, stockEffectOfStatusChange } from "~/lib/domain/order-status";
import { containsPattern, ORDER_SEARCH_MAX } from "~/lib/domain/order-search";
import { countsAsSaleSql } from "~/server/orders/sales-filter";

type Transaction = Parameters<Parameters<typeof appDb.transaction>[0]>[0];

/**
 * Products the Paystack finalizer could not decrement for this order (stock
 * ran out between checkout and payment). The finalizer persists this evidence
 * in its ORDER_NEEDS_ATTENTION record inside the status/stock transaction.
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

/**
 * Orders whose id, guest contact fields, or linked customer's name / email /
 * phone contain `term`. The customer match is a subquery builder (not raw
 * SQL) so relational-query aliasing leaves it alone.
 */
function orderSearchCondition(db: typeof appDb, tenantId: string, term: string | undefined) {
  const pattern = containsPattern(term);
  if (!pattern) return undefined;
  return or(
    ilike(orders.id, pattern),
    ilike(orders.customerName, pattern),
    ilike(orders.customerEmail, pattern),
    ilike(orders.customerPhone, pattern),
    inArray(
      orders.customerId,
      db
        .select({ id: customers.id })
        .from(customers)
        .where(and(
          eq(customers.tenantId, tenantId),
          or(ilike(customers.name, pattern), ilike(customers.email, pattern), ilike(customers.phone, pattern)),
        )),
    ),
  );
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
        paymentMethod: z.string().max(50).optional(),
        /** Order id, customer name, email or phone. */
        search: z.string().trim().max(ORDER_SEARCH_MAX).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereBase = and(
        orderSearchCondition(ctx.db, ctx.tenantId, input.search),
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

  /**
   * Paginated sales history for the staff Sales History page (cashiers
   * included, like pos.listOrders). Revenue is summed in SQL over every
   * matching order that counts as a sale, not just the visible page.
   */
  salesHistory: staffProcedure
    .input(
      z.object({
        search: z.string().trim().max(ORDER_SEARCH_MAX).optional(),
        page: z.number().int().min(1).max(10_000).default(1),
        pageSize: z.number().int().min(1).max(100).default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = and(eq(orders.tenantId, ctx.tenantId), orderSearchCondition(ctx.db, ctx.tenantId, input.search));
      const [items, [totals]] = await Promise.all([
        ctx.db.query.orders.findMany({
          where,
          orderBy: desc(orders.createdAt),
          limit: input.pageSize,
          offset: (input.page - 1) * input.pageSize,
          columns: {
            id: true,
            createdAt: true,
            totalAmount: true,
            status: true,
            paymentMethod: true,
            customerName: true,
            customerEmail: true,
          },
          with: {
            customer: { columns: { name: true, email: true } },
            items: { columns: { id: true } },
          },
        }),
        ctx.db
          .select({
            total: sql<number>`count(*)::int`,
            saleCount: sql<number>`(count(*) filter (where ${countsAsSaleSql()}))::int`,
            revenue: sql<string>`coalesce(sum(${orders.totalAmount}) filter (where ${countsAsSaleSql()}), 0)::text`,
          })
          .from(orders)
          .where(where),
      ]);
      return {
        items: items.map(({ items: lines, ...order }) => ({ ...order, itemCount: lines.length })),
        total: Number(totals?.total ?? 0),
        saleCount: Number(totals?.saleCount ?? 0),
        revenue: Number(totals?.revenue ?? 0),
        page: input.page,
        pageSize: input.pageSize,
      };
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




