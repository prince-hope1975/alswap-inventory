import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "~/server/api/trpc";
import { adminNotifications } from "~/server/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

export const notificationsRouter = createTRPCRouter({
  list: tenantProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(), // createdAt ISO
        unreadOnly: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Simple cursor pagination by createdAt (desc)
      const whereBase = and(
        eq(adminNotifications.tenantId, ctx.tenantId),
        input.unreadOnly ? eq(adminNotifications.isRead, false) : undefined,
        input.cursor
          ? sql`${adminNotifications.createdAt} < ${new Date(input.cursor)}`
          : undefined,
      );

      const rows = await ctx.db.query.adminNotifications.findMany({
        where: whereBase,
        orderBy: desc(adminNotifications.createdAt),
        limit: input.limit + 1,
      });

      const items = rows.slice(0, input.limit);
      const nextCursor =
        rows.length > input.limit
          ? items[items.length - 1]?.createdAt.toISOString()
          : undefined;

      return { items, nextCursor };
    }),

  unreadCount: tenantProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(adminNotifications)
      .where(and(eq(adminNotifications.tenantId, ctx.tenantId), eq(adminNotifications.isRead, false)));
    return { count: rows[0]?.count ?? 0 };
  }),

  markRead: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(adminNotifications)
        .set({ isRead: true })
        .where(and(eq(adminNotifications.id, input.id), eq(adminNotifications.tenantId, ctx.tenantId)));
      return { success: true };
    }),

  markAllRead: tenantProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(adminNotifications)
      .set({ isRead: true })
      .where(and(eq(adminNotifications.tenantId, ctx.tenantId), eq(adminNotifications.isRead, false)));
    return { success: true };
  }),
});




