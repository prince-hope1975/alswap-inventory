import { z } from "zod";
import { createTRPCRouter, publicProcedure, tenantProcedure } from "~/server/api/trpc";
import { reviews, products, tenants } from "~/server/db/schema";
import { eq, and, desc, sql, avg } from "drizzle-orm";

export const reviewsRouter = createTRPCRouter({
  createReview: publicProcedure
    .input(
      z.object({
        productId: z.string(),
        customerName: z.string().min(1).max(255),
        customerEmail: z.string().email(),
        rating: z.number().int().min(1).max(5),
        title: z.string().max(255).optional(),
        body: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.db.query.products.findFirst({
        where: eq(products.id, input.productId),
      });

      if (!product) {
        throw new Error("Product not found");
      }

      const [review] = await ctx.db
        .insert(reviews)
        .values({
          tenantId: product.tenantId,
          productId: input.productId,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          rating: input.rating,
          title: input.title ?? null,
          body: input.body ?? null,
          isApproved: false,
        })
        .returning();

      return review;
    }),

  getProductReviews: publicProcedure
    .input(
      z.object({
        productId: z.string(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const allReviews = await ctx.db.query.reviews.findMany({
        where: and(
          eq(reviews.productId, input.productId),
          eq(reviews.isApproved, true)
        ),
        orderBy: desc(reviews.createdAt),
        limit: input.limit,
        offset: input.offset,
      });

      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(reviews)
        .where(
          and(
            eq(reviews.productId, input.productId),
            eq(reviews.isApproved, true)
          )
        );

      return {
        reviews: allReviews,
        total: countResult?.count ?? 0,
      };
    }),

  getAverageRating: publicProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .select({
          average: avg(reviews.rating),
          count: sql<number>`count(*)`,
        })
        .from(reviews)
        .where(
          and(
            eq(reviews.productId, input.productId),
            eq(reviews.isApproved, true)
          )
        );

      return {
        average: result?.average ? Number(result.average) : null,
        count: result?.count ?? 0,
      };
    }),

  listReviews: tenantProcedure
    .input(
      z.object({
        productId: z.string().optional(),
        isApproved: z.boolean().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(reviews.tenantId, ctx.tenantId)];

      if (input?.productId) {
        conditions.push(eq(reviews.productId, input.productId));
      }

      if (input?.isApproved !== undefined) {
        conditions.push(eq(reviews.isApproved, input.isApproved));
      }

      const allReviews = await ctx.db.query.reviews.findMany({
        where: and(...conditions),
        orderBy: desc(reviews.createdAt),
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
        with: {
          product: {
            columns: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(reviews)
        .where(and(...conditions));

      return {
        reviews: allReviews,
        total: countResult?.count ?? 0,
      };
    }),

  approveReview: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const review = await ctx.db.query.reviews.findFirst({
        where: and(eq(reviews.id, input.id), eq(reviews.tenantId, ctx.tenantId)),
      });

      if (!review) {
        throw new Error("Review not found");
      }

      await ctx.db
        .update(reviews)
        .set({ isApproved: true })
        .where(eq(reviews.id, input.id));

      return { success: true };
    }),

  deleteReview: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const review = await ctx.db.query.reviews.findFirst({
        where: and(eq(reviews.id, input.id), eq(reviews.tenantId, ctx.tenantId)),
      });

      if (!review) {
        throw new Error("Review not found");
      }

      await ctx.db.delete(reviews).where(eq(reviews.id, input.id));

      return { success: true };
    }),
});
