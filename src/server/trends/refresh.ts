import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { comparisonBatches, scoreAgainstAnchor } from "~/lib/domain/demand";
import type { db as appDb } from "~/server/db";
import { trendRuns, trendSnapshots, trendTerms } from "~/server/db/schema";
import { GoogleUnofficialTrends } from "./google-unofficial";
import { TrendsBlockedError, type TrendsSource } from "./source";

type Database = typeof appDb;

/**
 * Per-run limits. One comparison or one seed costs two Google requests, so a
 * run makes at most (batches + seeds) * 2 calls. Small runs avoid tripping
 * Google's throttle and fit a serverless time limit; the oldest-fetched terms
 * go first, so the whole watchlist cycles over several daily runs.
 */
export const RUN_LIMITS = { comparisonBatches: 2, seeds: 2 } as const;

/** Pause between Google calls to look less like a burst. */
const PAUSE_MS = 1500;

const pause = () => new Promise((r) => setTimeout(r, PAUSE_MS));

/**
 * Stop starting new work after this long so the run is always logged before
 * the function's 60s limit; a killed function writes no trendRuns row and the
 * page would go stale without a warning.
 */
const TIME_BUDGET_MS = 40_000;

type RunOutcome = {
  status: "OK" | "PARTIAL" | "BLOCKED" | "FAILED";
  requestsMade: number;
  termsUpdated: number;
  error: string | null;
};

type TermRow = typeof trendTerms.$inferSelect;

export async function refreshTrends(
  database: Database,
  tenantId: string,
  trigger: "cron" | "manual",
  source: TrendsSource = new GoogleUnofficialTrends(),
): Promise<RunOutcome> {
  const startedAt = new Date();
  let termsUpdated = 0;
  const errors: string[] = [];
  let blocked = false;
  let outOfTime = false;

  // Marks terms as visited even when their fetch failed, so a term Google
  // rejects (say, a mistyped region) rotates to the back instead of being
  // picked first, and failing, on every run.
  const touch = (ids: number[], at: Date) =>
    database.update(trendTerms).set({ lastFetchedAt: at }).where(inArray(trendTerms.id, ids));

  /** Runs one unit of work; only a rate-limit stops the whole run. */
  const attempt = async (label: string, ids: number[], work: () => Promise<void>) => {
    if (blocked || outOfTime) return;
    if (Date.now() - startedAt.getTime() > TIME_BUDGET_MS) {
      outOfTime = true;
      return;
    }
    try {
      await work();
    } catch (err) {
      if (err instanceof TrendsBlockedError) {
        blocked = true;
        errors.push(err.message);
        return;
      }
      errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
      await touch(ids, new Date());
    }
    await pause();
  };

  try {
    const active = await database
      .select()
      .from(trendTerms)
      .where(and(eq(trendTerms.tenantId, tenantId), eq(trendTerms.isActive, true)))
      // Never-fetched terms first, then the stalest.
      .orderBy(sql`${trendTerms.lastFetchedAt} asc nulls first`, asc(trendTerms.id));

    const anchors = new Map(active.filter((t) => t.kind === "ANCHOR").map((t) => [t.geo, t]));
    // Only compare terms whose geo has an anchor; otherwise scores mean nothing.
    const compare = active.filter((t) => t.kind === "COMPARE" && anchors.has(t.geo));
    const seeds = active.filter((t) => t.kind === "SEED").slice(0, RUN_LIMITS.seeds);

    // Batch per geo, then take the stalest batches overall.
    const byGeo = new Map<string, TermRow[]>();
    for (const t of compare) byGeo.set(t.geo, [...(byGeo.get(t.geo) ?? []), t]);
    const batches = [...byGeo.values()]
      .flatMap((terms) => comparisonBatches(terms))
      .slice(0, RUN_LIMITS.comparisonBatches);

    for (const batch of batches) {
      const anchor = anchors.get(batch[0]!.geo)!;
      const ids = batch.map((t) => t.id);
      await attempt(`compare ${anchor.geo}`, ids, async () => {
        const { series } = await source.compare([anchor.term, ...batch.map((t) => t.term)], anchor.geo);
        const anchorValues = (series[anchor.term] ?? []).map((p) => p.value);
        const now = new Date();
        await database.insert(trendSnapshots).values(
          batch.map((t) => {
            const points = series[t.term] ?? [];
            return {
              tenantId,
              termId: t.id,
              ...scoreAgainstAnchor(points.map((p) => p.value), anchorValues),
              series: points,
              fetchedAt: now,
            };
          }),
        );
        await touch([anchor.id, ...ids], now);
        termsUpdated += batch.length;
      });
    }

    for (const seed of seeds) {
      await attempt(`explore "${seed.term}"`, [seed.id], async () => {
        const related = await source.related(seed.term, seed.geo);
        const now = new Date();
        await database.insert(trendSnapshots).values({ tenantId, termId: seed.id, related, fetchedAt: now });
        await touch([seed.id], now);
        termsUpdated++;
      });
    }
  } catch (err) {
    // Database trouble; nothing Google-related reaches here.
    errors.push(err instanceof Error ? err.message : String(err));
  }

  if (outOfTime) errors.push("Stopped early to stay within the time limit");
  const status: RunOutcome["status"] =
    errors.length === 0
      ? "OK"
      : termsUpdated > 0
        ? "PARTIAL"
        : blocked
          ? "BLOCKED"
          : "FAILED";
  const outcome: RunOutcome = {
    status,
    requestsMade: source.requestCount,
    termsUpdated,
    error: errors.length ? errors.join("; ").slice(0, 2000) : null,
  };

  await database.insert(trendRuns).values({ tenantId, trigger, startedAt, ...outcome });
  return outcome;
}
