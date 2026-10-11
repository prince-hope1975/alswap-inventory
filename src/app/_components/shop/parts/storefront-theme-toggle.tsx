"use client";

import { Moon, Sun } from "lucide-react";

import { useStorefrontThemeToggle } from "../use-storefront-theme";

/**
 * Light/dark switch for the storefront. Two states only: "System" would
 * follow the OS, which fights the storefront rule that an unset theme is light.
 */
export function StorefrontThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useStorefrontThemeToggle();
  const isDark = theme === "dark";
  const label = theme == null ? "Switch theme" : isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#14212b]/15 bg-white text-[#41515c] transition-colors hover:bg-[#dcecf2] hover:text-[#14212b] focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:ring-offset-2 focus-visible:outline-none dark:border-white/15 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-offset-[#0a1117] ${className}`}
    >
      {/* Shows what you'll switch to. */}
      {isDark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
    </button>
  );
}
