/**
 * Pure helpers for the Demand page: on-site search logging and Google Trends
 * scoring. Kept free of I/O so the cron job, the tRPC router and tests share
 * one definition.
 */

export const SEARCH_TERM_MIN = 2;
export const SEARCH_TERM_MAX = 80;

/**
 * Collapses a raw storefront search into the key it is counted under, or null
 * when it should not be logged at all. "  Solar   PANEL " and "solar panel"
 * must land on the same row or the daily counts split.
 */
export function normalizeSearchTerm(raw: string): string | null {
  const term = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (term.length < SEARCH_TERM_MIN || term.length > SEARCH_TERM_MAX) return null;
  // Pure punctuation or digits carries no product intent.
  if (!/\p{L}/u.test(term)) return null;
  return term;
}

/** Google Trends returns at most 5 terms per comparison; one slot is the anchor. */
export const TERMS_PER_COMPARISON = 4;

/** Weeks counted as "recent" when judging momentum. */
export const RECENT_WEEKS = 8;

function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/**
 * Trends values are relative within one request, so terms fetched in
 * different batches only compare through the anchor that appears in every
 * batch. Scores are expressed as "% of anchor": 100 means as searched as the
 * anchor, 240 means 2.4× the anchor.
 */
export function scoreAgainstAnchor(
  termSeries: number[],
  anchorSeries: number[],
): { yearScore: number; recentScore: number } {
  const ratio = (term: number[], anchor: number[]) => {
    const a = mean(anchor);
    return a > 0 ? Math.round((mean(term) / a) * 1000) / 10 : 0;
  };
  return {
    yearScore: ratio(termSeries, anchorSeries),
    recentScore: ratio(
      termSeries.slice(-RECENT_WEEKS),
      anchorSeries.slice(-RECENT_WEEKS),
    ),
  };
}

export type Momentum = "rising" | "falling" | "steady" | "unknown";

/**
 * Compares the recent window against the full-year score. Thresholds are wide
 * because state-level Trends data is sparse and jumps around week to week.
 */
export function momentum(yearScore: number, recentScore: number): Momentum {
  if (yearScore <= 0 && recentScore <= 0) return "unknown";
  if (yearScore <= 0) return "rising";
  const change = recentScore / yearScore;
  if (change >= 1.3) return "rising";
  if (change <= 0.7) return "falling";
  return "steady";
}

/** Splits terms into Trends-sized batches, each to be sent alongside the anchor. */
export function comparisonBatches<T>(terms: T[]): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < terms.length; i += TERMS_PER_COMPARISON) {
    batches.push(terms.slice(i, i + TERMS_PER_COMPARISON));
  }
  return batches;
}
