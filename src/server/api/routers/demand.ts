import { z } from "zod";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, managerProcedure, publicProcedure } from "~/server/api/trpc";
import { searchQueryDaily, trendRuns, trendSnapshots, trendTerms } from "~/server/db/schema";
import { resolvePublicTenant } from "~/server/tenant";
import { momentum, normalizeSearchTerm } from "~/lib/domain/demand";
import { refreshTrends } from "~/server/trends/refresh";

/** Manual refreshes share Google's throttle with the cron; space them out. */
const MANUAL_REFRESH_COOLDOWN_MS = 6 * 60 * 60 * 1000;

const geoSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}(-[A-Z0-9]{1,3})?$/, "Use a Trends geo code like NG or NG-DE");

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

export const demandRouter = createTRPCRouter({
  /**
   * Called by the storefront once a typed search settles. Public and
   * anonymous: the tenant comes from the request host, never the client.
   */
  logSearch: publicProcedure
    .input(
      z.object({
        term: z.string().max(200),
        resultCount: z.number().int().min(0).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const term = normalizeSearchTerm(input.term);
      if (!term) return { logged: false };
      const tenant = await resolvePublicTenant(ctx.db, ctx.headers);
      if (!tenant) return { logged: false };

      const zero = input.resultCount === 0 ? 1 : 0;
      await ctx.db
        .insert(searchQueryDaily)
        .values({
          tenantId: tenant.id,
          term,
          day: isoDay(new Date()),
          searches: 1,
          zeroResultSearches: zero,
          lastResultCount: input.resultCount,
        })
        .onConflictDoUpdate({
          target: [searchQueryDaily.tenantId, searchQueryDaily.term, searchQueryDaily.day],
          set: {
            searches: sql`${searchQueryDaily.searches} + 1`,
            zeroResultSearches: sql`${searchQueryDaily.zeroResultSearches} + ${zero}`,
            lastResultCount: input.resultCount,
            updatedAt: new Date(),
          },
        });
      return { logged: true };
    }),

  getSearchInsights: managerProcedure
    .input(z.object({ days: z.number().int().min(1).max(365).default(30) }))
    .query(async ({ ctx, input }) => {
      const since = isoDay(new Date(Date.now() - input.days * 24 * 60 * 60 * 1000));
      const scope = and(
        eq(searchQueryDaily.tenantId, ctx.tenantId),
        gte(searchQueryDaily.day, since),
      );

      const terms = await ctx.db
        .select({
          term: searchQueryDaily.term,
          searches: sql<number>`sum(${searchQueryDaily.searches})::int`,
          zeroResultSearches: sql<number>`sum(${searchQueryDaily.zeroResultSearches})::int`,
          lastSeen: sql<string>`max(${searchQueryDaily.day})`,
        })
        .from(searchQueryDaily)
        .where(scope)
        .groupBy(searchQueryDaily.term)
        .orderBy(desc(sql`sum(${searchQueryDaily.searches})`))
        .limit(200);

      const daily = await ctx.db
        .select({
          day: searchQueryDaily.day,
          searches: sql<number>`sum(${searchQueryDaily.searches})::int`,
          zeroResultSearches: sql<number>`sum(${searchQueryDaily.zeroResultSearches})::int`,
        })
        .from(searchQueryDaily)
        .where(scope)
        .groupBy(searchQueryDaily.day)
        .orderBy(searchQueryDaily.day);

      return {
        topTerms: terms.slice(0, 50),
        // Searched for but not found: the clearest restocking signal.
        unmet: terms
          .filter((t) => t.zeroResultSearches > 0)
          .sort((a, b) => b.zeroResultSearches - a.zeroResultSearches)
          .slice(0, 50),
        daily,
        totals: {
          searches: terms.reduce((n, t) => n + t.searches, 0),
          zeroResultSearches: terms.reduce((n, t) => n + t.zeroResultSearches, 0),
          distinctTerms: terms.length,
        },
      };
    }),

  getTrends: managerProcedure.query(async ({ ctx }) => {
    const terms = await ctx.db
      .select()
      .from(trendTerms)
      .where(eq(trendTerms.tenantId, ctx.tenantId))
      .orderBy(trendTerms.kind, trendTerms.term);

    const ids = terms.map((t) => t.id);
    const latest = ids.length
      ? await ctx.db
          .selectDistinctOn([trendSnapshots.termId])
          .from(trendSnapshots)
          .where(inArray(trendSnapshots.termId, ids))
          .orderBy(trendSnapshots.termId, desc(trendSnapshots.fetchedAt))
      : [];
    const byTerm = new Map(latest.map((s) => [s.termId, s]));

    const runs = await ctx.db
      .select()
      .from(trendRuns)
      .where(eq(trendRuns.tenantId, ctx.tenantId))
      .orderBy(desc(trendRuns.startedAt))
      .limit(10);

    return {
      terms: terms.map((t) => {
        const snap = byTerm.get(t.id);
        const yearScore = snap?.yearScore ?? null;
        const recentScore = snap?.recentScore ?? null;
        return {
          ...t,
          yearScore,
          recentScore,
          momentum:
            yearScore != null && recentScore != null ? momentum(yearScore, recentScore) : "unknown",
          series: snap?.series ?? null,
          related: snap?.related ?? null,
          fetchedAt: snap?.fetchedAt ?? null,
        };
      }),
      runs,
      lastSuccess: runs.find((r) => r.status === "OK" || r.status === "PARTIAL")?.finishedAt ?? null,
    };
  }),

  /** Adds one term per line; duplicates are ignored. */
  addTerms: managerProcedure
    .input(
      z.object({
        terms: z.array(z.string().trim().min(2).max(100)).min(1).max(100),
        geo: geoSchema,
        kind: z.enum(["ANCHOR", "COMPARE", "SEED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.kind === "ANCHOR") {
        if (input.terms.length !== 1) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Set exactly one anchor per region" });
        }
        // One anchor per geo: retire the old one so batches stay comparable.
        await ctx.db
          .update(trendTerms)
          .set({ isActive: false })
          .where(
            and(
              eq(trendTerms.tenantId, ctx.tenantId),
              eq(trendTerms.geo, input.geo),
              eq(trendTerms.kind, "ANCHOR"),
            ),
          );
      }
      const unique = [...new Set(input.terms.map((t) => t.toLowerCase().replace(/\s+/g, " ")))];
      await ctx.db
        .insert(trendTerms)
        .values(unique.map((term) => ({ tenantId: ctx.tenantId, term, geo: input.geo, kind: input.kind })))
        .onConflictDoUpdate({
          target: [trendTerms.tenantId, trendTerms.term, trendTerms.geo, trendTerms.kind],
          set: { isActive: true },
        });
      return { added: unique.length };
    }),

  setTermActive: managerProcedure
    .input(z.object({ id: z.number().int(), isActive: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.db
        .update(trendTerms)
        .set({ isActive: input.isActive })
        .where(and(eq(trendTerms.id, input.id), eq(trendTerms.tenantId, ctx.tenantId))),
    ),

  removeTerm: managerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) =>
      ctx.db
        .delete(trendTerms)
        .where(and(eq(trendTerms.id, input.id), eq(trendTerms.tenantId, ctx.tenantId))),
    ),

  refreshNow: managerProcedure.mutation(async ({ ctx }) => {
    const [last] = await ctx.db
      .select({ startedAt: trendRuns.startedAt })
      .from(trendRuns)
      .where(and(eq(trendRuns.tenantId, ctx.tenantId), eq(trendRuns.trigger, "manual")))
      .orderBy(desc(trendRuns.startedAt))
      .limit(1);
    if (last && Date.now() - last.startedAt.getTime() < MANUAL_REFRESH_COOLDOWN_MS) {
      const hours = Math.ceil(
        (MANUAL_REFRESH_COOLDOWN_MS - (Date.now() - last.startedAt.getTime())) / 3_600_000,
      );
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Manual refresh is limited to once every 6 hours. Try again in about ${hours}h.`,
      });
    }
    return refreshTrends(ctx.db, ctx.tenantId, "manual");
  }),
});
