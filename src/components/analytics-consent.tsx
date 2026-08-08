"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

import {
  ANALYTICS_CONSENT_KEY,
  analyticsConsentFromStorage,
  type AnalyticsConsent as Consent,
} from "~/lib/analytics/consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function loadAnalytics(measurementId: string) {
  if (document.querySelector(`script[data-ga4="${measurementId}"]`)) return;
  const external = document.createElement("script");
  external.async = true;
  external.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  external.dataset.ga4 = measurementId;
  document.head.appendChild(external);

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { anonymize_ip: true });
}

export function trackStorefrontEvent(
  name: string,
  parameters: Record<string, string | number | boolean> = {},
) {
  window.gtag?.("event", name, parameters);
}

export function AnalyticsConsent({
  measurementId,
}: {
  measurementId?: string;
}) {
  const [consent, setConsent] = useState<Consent>("undecided");

  useEffect(() => {
    const stored = analyticsConsentFromStorage(
      localStorage.getItem(ANALYTICS_CONSENT_KEY),
    );
    setConsent(stored);
    if (stored === "granted" && measurementId) loadAnalytics(measurementId);
  }, [measurementId]);

  const choose = (next: Exclude<Consent, "undecided">) => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, next);
    setConsent(next);
    if (next === "granted" && measurementId) loadAnalytics(measurementId);
  };

  if (!measurementId || consent !== "undecided") return null;

  return (
    <aside
      role="dialog"
      aria-label="Privacy choices"
      aria-describedby="analytics-consent-copy"
      className="fixed right-4 bottom-4 left-4 z-[100] mx-auto max-w-2xl border border-[#14212b] bg-[#f5f3ed] p-5 text-[#14212b] shadow-[8px_8px_0_#f5a623] sm:left-auto sm:p-6"
    >
      <div className="flex items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center bg-[#112b3c] text-[#f5a623]">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-black tracking-[-0.02em]">
            Your privacy, your choice
          </h2>
          <p
            id="analytics-consent-copy"
            className="mt-2 text-sm leading-6 text-[#41515c]"
          >
            Allow anonymous analytics so we can understand which Google and AI
            searches help customers find the store. Checkout works either way.
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => choose("denied")}
          className="min-h-11 border border-[#14212b] px-5 text-sm font-black hover:bg-white"
        >
          Decline analytics
        </button>
        <button
          type="button"
          onClick={() => choose("granted")}
          className="min-h-11 bg-[#112b3c] px-5 text-sm font-black text-white hover:bg-[#0b6e99]"
        >
          Allow analytics
        </button>
      </div>
    </aside>
  );
}
