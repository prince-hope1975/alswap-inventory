"use client";

import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";

import { resolveStorefrontTheme } from "~/lib/domain/storefront-theme";

type ConfiguredTheme = "light" | "dark" | "system";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function readStored(): string | null {
  try {
    return localStorage.getItem("theme");
  } catch {
    return null;
  }
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/**
 * Apply the storefront theme rule (shopper's explicit light/dark choice, else
 * the store's configured mode, with "system" meaning light) on every
 * storefront page: /shop and the product page share this so they never
 * disagree. Runs as a layout effect so a soft navigation doesn't flash.
 */
export function useStorefrontTheme(configured: ConfiguredTheme | null | undefined) {
  useIsoLayoutEffect(() => {
    applyTheme(resolveStorefrontTheme(configured ?? "system", readStored()));
  }, [configured]);
}

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** Current storefront theme (null during SSR) and a light/dark toggle. */
export function useStorefrontThemeToggle() {
  const theme = useSyncExternalStore(
    subscribe,
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    () => null,
  );
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private mode: the choice lasts for this page only.
    }
    applyTheme(next);
  };
  return { theme, toggle };
}
