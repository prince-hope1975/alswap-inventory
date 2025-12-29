import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "~/server/api/trpc";
import { orders } from "~/server/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

export const ordersRouter = createTRPCRouter({
  list: tenantProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(), // createdAt ISO
        status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]).optional(),
        deliveryMethod: z.enum(["PICKUP", "DELIVERY"]).optional(),
        paymentMethod: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereBase = and(
        eq(orders.tenantId, ctx.tenantId),
        input.status ? eq(orders.status, input.status) : undefined,
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

  get: tenantProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
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

  updateStatus: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(orders)
        .set({ status: input.status })
        .where(and(eq(orders.id, input.id), eq(orders.tenantId, ctx.tenantId)));
      return { success: true };
    }),
});


