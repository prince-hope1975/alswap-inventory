import { z } from "zod";
import { createTRPCRouter, publicProcedure, tenantProcedure } from "~/server/api/trpc";
import { articles } from "~/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { resolvePublicTenant } from "~/server/tenant";

export const articlesRouter = createTRPCRouter({
  createArticle: tenantProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        slug: z.string().min(1).max(255),
        excerpt: z.string().optional(),
        content: z.string().optional(),
        coverImage: z.string().url().optional().or(z.literal("")),
        authorName: z.string().optional(),
        isPublished: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.articles.findFirst({
        where: and(eq(articles.slug, input.slug), eq(articles.tenantId, ctx.tenantId)),
      });

      if (existing) {
        throw new Error("An article with this slug already exists");
      }

      const [article] = await ctx.db
        .insert(articles)
        .values({
          tenantId: ctx.tenantId,
          title: input.title,
          slug: input.slug,
          excerpt: input.excerpt ?? null,
          content: input.content ?? null,
          coverImage: input.coverImage || null,
          authorName: input.authorName ?? null,
          isPublished: input.isPublished,
          publishedAt: input.isPublished ? new Date() : null,
        })
        .returning();

      return article;
    }),

  updateArticle: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(255).optional(),
        slug: z.string().min(1).max(255).optional(),
        excerpt: z.string().optional(),
        content: z.string().optional(),
        coverImage: z.string().url().optional().or(z.literal("")),
        authorName: z.string().optional(),
        isPublished: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.articles.findFirst({
        where: and(eq(articles.id, input.id), eq(articles.tenantId, ctx.tenantId)),
      });

      if (!existing) {
        throw new Error("Article not found");
      }

      if (input.slug && input.slug !== existing.slug) {
        const slugConflict = await ctx.db.query.articles.findFirst({
          where: and(eq(articles.slug, input.slug), eq(articles.tenantId, ctx.tenantId)),
        });
        if (slugConflict) {
          throw new Error("An article with this slug already exists");
        }
      }

      const updateData: Record<string, unknown> = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.slug !== undefined) updateData.slug = input.slug;
      if (input.excerpt !== undefined) updateData.excerpt = input.excerpt || null;
      if (input.content !== undefined) updateData.content = input.content || null;
      if (input.coverImage !== undefined) updateData.coverImage = input.coverImage || null;
      if (input.authorName !== undefined) updateData.authorName = input.authorName || null;
      if (input.isPublished !== undefined) {
        updateData.isPublished = input.isPublished;
        if (input.isPublished && !existing.publishedAt) {
          updateData.publishedAt = new Date();
        }
      }

      if (Object.keys(updateData).length > 0) {
        await ctx.db
          .update(articles)
          .set(updateData)
          .where(eq(articles.id, input.id));
      }

      return ctx.db.query.articles.findFirst({
        where: eq(articles.id, input.id),
      });
    }),

  deleteArticle: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.articles.findFirst({
        where: and(eq(articles.id, input.id), eq(articles.tenantId, ctx.tenantId)),
      });

      if (!existing) {
        throw new Error("Article not found");
      }

      await ctx.db.delete(articles).where(eq(articles.id, input.id));

      return { success: true };
    }),

  listArticles: tenantProcedure
    .input(
      z.object({
        isPublished: z.boolean().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(articles.tenantId, ctx.tenantId)];

      if (input?.isPublished !== undefined) {
        conditions.push(eq(articles.isPublished, input.isPublished));
      }

      const allArticles = await ctx.db.query.articles.findMany({
        where: and(...conditions),
        orderBy: desc(articles.createdAt),
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
      });

      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(articles)
        .where(and(...conditions));

      return {
        articles: allArticles,
        total: countResult?.count ?? 0,
      };
    }),

  getPublishedArticles: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const tenant = await resolvePublicTenant(ctx.db, ctx.headers);
      if (!tenant) return { articles: [], total: 0 };

      const allArticles = await ctx.db.query.articles.findMany({
        where: and(
          eq(articles.tenantId, tenant.id),
          eq(articles.isPublished, true)
        ),
        orderBy: desc(articles.publishedAt),
        limit: input?.limit ?? 20,
        offset: input?.offset ?? 0,
      });

      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(articles)
        .where(
          and(
            eq(articles.tenantId, tenant.id),
            eq(articles.isPublished, true)
          )
        );

      return {
        articles: allArticles,
        total: countResult?.count ?? 0,
      };
    }),

  getArticleBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenant = await resolvePublicTenant(ctx.db, ctx.headers);
      if (!tenant) return null;

      return ctx.db.query.articles.findFirst({
        where: and(
          eq(articles.slug, input.slug),
          eq(articles.tenantId, tenant.id),
          eq(articles.isPublished, true)
        ),
      });
    }),
});
