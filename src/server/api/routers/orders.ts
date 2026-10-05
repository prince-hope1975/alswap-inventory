import { z } from "zod";
import { createTRPCRouter, managerProcedure } from "~/server/api/trpc";
import { orders } from "~/server/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { manualStatusChangeError } from "~/lib/domain/order-status";

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
      const order = await ctx.db.query.orders.findFirst({
        where: and(eq(orders.id, input.id), eq(orders.tenantId, ctx.tenantId)),
        columns: { id: true, status: true, paymentMethod: true },
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      const blocked = manualStatusChangeError(order, input.status);
      if (blocked) throw new TRPCError({ code: "BAD_REQUEST", message: blocked });

      // Conditional on the status we checked, so a payment finalizing in the
      // meantime (PENDING -> COMPLETED) is not overwritten by a stale click.
      const [updated] = await ctx.db
        .update(orders)
        .set({ status: input.status })
        .where(and(eq(orders.id, input.id), eq(orders.tenantId, ctx.tenantId), eq(orders.status, order.status)))
        .returning({ id: orders.id });
      if (!updated) {
        throw new TRPCError({ code: "CONFLICT", message: "The order changed while you were looking at it. Refresh and try again." });
      }
      return { success: true };
    }),
});




