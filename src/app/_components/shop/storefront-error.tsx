"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCcw, ShoppingBag } from "lucide-react";

import { logger } from "~/lib/error-logger";

/**
 * Shopper-facing error screen for storefront routes: storefront colours, a
 * retry, and a way back to the shop (never a staff dashboard link).
 */
export function StorefrontError({
  error,
  reset,
  title = "This page didn't load",
  componentName,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  componentName: string;
}) {
  useEffect(() => {
    logger.log(error, { componentName });
  }, [error, componentName]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f4ee] px-4 py-16 text-[#14212b] dark:bg-[#0a1117] dark:text-white">
      <div className="w-full max-w-md rounded-2xl border border-[#14212b]/12 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-[#0f1a22]">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-[#dcecf2] text-[#0b6e99] dark:bg-[#112b3c] dark:text-[#8dc5dc]">
          <ShoppingBag className="h-8 w-8" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[#5c6870] dark:text-gray-400">
          Something went wrong on our side. It&apos;s usually a brief connection
          hiccup; trying again normally fixes it.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-[#6b767d] dark:text-gray-500">Ref: {error.digest}</p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#f5a623] px-6 font-bold text-[#14212b] hover:bg-[#ffc04d] focus-visible:ring-2 focus-visible:ring-[#14212b] focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-white dark:focus-visible:ring-offset-[#0f1a22]"
          >
            <RefreshCcw className="h-4 w-4" aria-hidden />
            Try again
          </button>
          <Link
            href="/shop"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#14212b]/20 px-6 font-semibold hover:bg-[#14212b]/5 focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:ring-offset-2 focus-visible:outline-none dark:border-white/20 dark:hover:bg-white/10 dark:focus-visible:ring-offset-[#0f1a22]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to shop
          </Link>
        </div>
      </div>
    </main>
  );
}
