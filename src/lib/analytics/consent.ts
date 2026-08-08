export const ANALYTICS_CONSENT_KEY = "sppd-analytics-consent";

export type AnalyticsConsent = "granted" | "denied" | "undecided";

export function analyticsConsentFromStorage(
  value: string | null,
): AnalyticsConsent {
  return value === "granted" || value === "denied" ? value : "undecided";
}

export function analyticsEventSource(search: string): "chatgpt" | "other" {
  const source = new URLSearchParams(search).get("utm_source")?.toLowerCase();
  return source === "chatgpt.com" ? "chatgpt" : "other";
}
