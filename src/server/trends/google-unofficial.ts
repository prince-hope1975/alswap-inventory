import "server-only";
import {
  TrendsBlockedError,
  type ComparisonResult,
  type RelatedResult,
  type TrendsSource,
} from "./source";

const BASE = "https://trends.google.com/trends";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

type Widget = { id: string; token: string; request: unknown };

/** A hung Google call must not outlive the serverless function and skip the run log. */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * The JSON endpoints behind trends.google.com. Unofficial: no key, no SLA,
 * and Google throttles datacenter IPs, so every caller must expect
 * TrendsBlockedError and fall back to the last stored snapshot.
 */
export class GoogleUnofficialTrends implements TrendsSource {
  requestCount = 0;
  private cookie: string | null = null;

  private async ensureCookie() {
    if (this.cookie !== null) return;
    // The explore page sets an NID cookie the API accepts. It often answers
    // 429 itself yet still sets the cookie, so the status is ignored.
    const res = await fetch(`${BASE}/explore?geo=NG`, {
      headers: HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    this.cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<T> {
    await this.ensureCookie();
    const url = `${BASE}/api/${path}?${new URLSearchParams({ hl: "en-US", tz: "-60", ...params })}`;
    this.requestCount++;
    const res = await fetch(url, {
      headers: { ...HEADERS, ...(this.cookie ? { Cookie: this.cookie } : {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.status === 429) throw new TrendsBlockedError();
    if (!res.ok) throw new Error(`Google Trends ${path} answered HTTP ${res.status}`);
    const text = await res.text();
    // Responses start with an anti-JSON-hijacking prefix such as ")]}'".
    return JSON.parse(text.slice(text.indexOf("{"))) as T;
  }

  private async explore(terms: string[], geo: string): Promise<Widget[]> {
    const req = {
      comparisonItem: terms.map((keyword) => ({ keyword, geo, time: "today 12-m" })),
      category: 0,
      property: "",
    };
    const data = await this.get<{ widgets: Widget[] }>("explore", { req: JSON.stringify(req) });
    return data.widgets;
  }

  private widget<T>(path: string, w: Widget): Promise<T> {
    return this.get<T>(`widgetdata/${path}`, { req: JSON.stringify(w.request), token: w.token });
  }

  async compare(terms: string[], geo: string): Promise<ComparisonResult> {
    const widgets = await this.explore(terms, geo);
    const ts = widgets.find((w) => w.id === "TIMESERIES");
    if (!ts) throw new Error("Google Trends returned no timeline");
    const data = await this.widget<{
      default: { timelineData: { formattedTime: string; value: number[] }[] };
    }>("multiline", ts);
    const series: ComparisonResult["series"] = {};
    terms.forEach((term, i) => {
      series[term] = data.default.timelineData.map((p) => ({
        week: p.formattedTime,
        value: p.value[i] ?? 0,
      }));
    });
    return { series };
  }

  async related(term: string, geo: string): Promise<RelatedResult> {
    const widgets = await this.explore([term], geo);
    const rq = widgets.find((w) => w.id === "RELATED_QUERIES");
    // Too little search volume: Google omits the widget rather than erroring.
    if (!rq) return { top: [], rising: [] };
    type Ranked = { query: string; value: number; formattedValue?: string };
    const data = await this.widget<{
      default: { rankedList: { rankedKeyword: Ranked[] }[] };
    }>("relatedsearches", rq);
    const [top, rising] = data.default.rankedList;
    return {
      top: (top?.rankedKeyword ?? []).slice(0, 15).map((k) => ({ query: k.query, value: k.value })),
      rising: (rising?.rankedKeyword ?? [])
        .slice(0, 15)
        .map((k) => ({ query: k.query, value: k.formattedValue ?? String(k.value) })),
    };
  }
}
