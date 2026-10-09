"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { btnSecondary } from "./styles";

/** Inline "couldn't load" banner with a Retry button. */
export function LoadError({
  message,
  onRetry,
  retrying = false,
  title = "Couldn't load this data.",
}: {
  message?: string;
  onRetry: () => void;
  retrying?: boolean;
  title?: string;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          <span className="font-semibold">{title}</span> {message}
        </p>
      </div>
      <button type="button" className={btnSecondary} onClick={onRetry} disabled={retrying}>
        <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}
