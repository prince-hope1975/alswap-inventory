import "server-only";

export type WeeklyPoint = { week: string; value: number };

export type ComparisonResult = {
  /** Weekly values per term, all relative to the same request's peak. */
  series: Record<string, WeeklyPoint[]>;
};

export type RelatedResult = {
  top: { query: string; value: number }[];
  rising: { query: string; value: string }[];
};

/**
 * Where trend data comes from. The free unofficial Google endpoint is the
 * only implementation today; a paid provider (e.g. DataForSEO) can replace it
 * without touching the refresh job or the page.
 */
export interface TrendsSource {
  /** Up to 5 terms in one request, over the last 12 months. */
  compare(terms: string[], geo: string): Promise<ComparisonResult>;
  related(term: string, geo: string): Promise<RelatedResult>;
  /** Requests made so far, for the run log. */
  readonly requestCount: number;
}

/** Thrown when the provider rate-limits us; the job stops and keeps old data. */
export class TrendsBlockedError extends Error {
  constructor(message = "Google Trends rate-limited this server (HTTP 429)") {
    super(message);
    this.name = "TrendsBlockedError";
  }
}
