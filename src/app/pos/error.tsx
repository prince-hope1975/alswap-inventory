"use client";

import { useEffect } from "react";
import { logger } from "~/lib/error-logger";
import { ShoppingCart, RefreshCcw, Monitor, WifiOff } from "lucide-react";

export default function POSError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        logger.log(error, { componentName: "POSRouteError", route: "/pos" });
    }, [error]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center dark:bg-gray-950">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-amber-50 text-amber-600 shadow-inner dark:bg-amber-900/20 dark:text-amber-400">
                <ShoppingCart className="h-12 w-12" />
            </div>

            <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                POS Terminal Error
            </h1>

            <p className="mb-8 max-w-lg text-lg text-gray-600 dark:text-gray-400">
                The POS terminal encountered a technical glitch. Don&apos;t worry, your cart data is likely safe in the local cache.
            </p>

            <div className="mb-10 flex items-center gap-4 rounded-xl border border-amber-100 bg-amber-50/50 p-4 text-left dark:border-amber-900/30 dark:bg-amber-900/10">
                <div className="rounded-full bg-amber-100 p-2 text-amber-600 dark:bg-amber-800 dark:text-amber-400">
                    <WifiOff className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-300">Offline Recovery</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">If you have no internet, try switching to offline mode.</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                    onClick={() => reset()}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)] px-10 py-4 text-lg font-bold text-white shadow-xl transition-all hover:scale-105 active:scale-95"
                >
                    <RefreshCcw className="h-6 w-6" />
                    Restart POS
                </button>

                <button
                    onClick={() => window.location.href = "/inventory"}
                    className="flex items-center gap-2 rounded-2xl border-2 border-gray-200 bg-white px-10 py-4 text-lg font-bold text-gray-700 shadow-md transition-all hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 active:scale-95"
                >
                    <Monitor className="h-6 w-6" />
                    Exit to Dashboard
                </button>
            </div>
        </div>
    );
}
