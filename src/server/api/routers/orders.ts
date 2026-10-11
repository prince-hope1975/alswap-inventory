import { z } from "zod";
import {
  createTRPCRouter,
  managerProcedure,
  staffProcedure,
} from "~/server/api/trpc";
import type { db as appDb } from "~/server/db";
import { customers, orders } from "~/server/db/schema";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { changeOrderStatus } from "~/server/orders/change-status";
import { expirePickupReservations } from "~/server/orders/expire-pickup";
import { containsPattern, ORDER_SEARCH_MAX } from "~/lib/domain/order-search";
import { countsAsSaleSql } from "~/server/orders/sales-filter";

/**
 * Orders whose id, guest contact fields, or linked customer's name / email /
 * phone contain `term`. The customer match is a subquery builder (not raw
 * SQL) so relational-query aliasing leaves it alone.
 */
function orderSearchCondition(
  db: typeof appDb,
  tenantId: string,
  term: string | undefined,
) {
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
        .where(
          and(
            eq(customers.tenantId, tenantId),
            or(
              ilike(customers.name, pattern),
              ilike(customers.email, pattern),
              ilike(customers.phone, pattern),
            ),
          ),
        ),
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
        status: z
          .enum(["PENDING", "COMPLETED", "CANCELLED", "AWAITING_PAYMENT"])
          .optional(),
        deliveryMethod: z.enum(["PICKUP", "DELIVERY"]).optional(),
        paymentMethod: z.string().max(50).optional(),
        /** Order id, customer name, email or phone. */
        search: z.string().trim().max(ORDER_SEARCH_MAX).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await expirePickupReservations(ctx.db, ctx.tenantId);
      const whereBase = and(
        orderSearchCondition(ctx.db, ctx.tenantId, input.search),
        eq(orders.tenantId, ctx.tenantId),
        input.status === "AWAITING_PAYMENT"
          ? awaitingPaymentSql
          : input.status
            ? and(
                eq(orders.status, input.status),
                sql`not ${awaitingPaymentSql}`,
              )
            : sql`not ${awaitingPaymentSql}`,
        input.deliveryMethod
          ? eq(orders.deliveryMethod, input.deliveryMethod)
          : undefined,
        input.paymentMethod
          ? eq(orders.paymentMethod, input.paymentMethod)
          : undefined,
        input.cursor
          ? sql`${orders.createdAt} < ${new Date(input.cursor)}`
          : undefined,
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
      const where = and(
        eq(orders.tenantId, ctx.tenantId),
        orderSearchCondition(ctx.db, ctx.tenantId, input.search),
      );
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
        items: items.map(({ items: lines, ...order }) => ({
          ...order,
          itemCount: lines.length,
        })),
        total: Number(totals?.total ?? 0),
        saleCount: Number(totals?.saleCount ?? 0),
        revenue: Number(totals?.revenue ?? 0),
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  get: managerProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await expirePickupReservations(ctx.db, ctx.tenantId);
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
      await expirePickupReservations(ctx.db, tenantId);
      await changeOrderStatus(ctx.db, tenantId, input.id, input.status);
      return { success: true };
    }),
});
