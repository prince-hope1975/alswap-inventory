"use client";

import { useEffect } from "react";
import { logger } from "~/lib/error-logger";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to our custom logger
        logger.log(error, { componentName: "GlobalAppError" });
    }, [error]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center dark:bg-gray-950">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <AlertCircle className="h-10 w-10" />
            </div>

            <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Something went wrong!
            </h1>

            <p className="mb-8 max-w-md text-gray-600 dark:text-gray-400">
                We apologize for the inconvenience. An unexpected error occurred in the application.
                Our technical team has been notified and is looking into it.
            </p>

            {process.env.NODE_ENV === "development" && (
                <div className="mb-8 w-full max-w-2xl overflow-hidden rounded-lg border border-red-200 bg-red-50 p-4 text-left dark:border-red-900/30 dark:bg-red-900/10">
                    <p className="mb-2 font-mono text-sm font-bold text-red-700 dark:text-red-400">
                        Error Details (Dev Only):
                    </p>
                    <pre className="overflow-x-auto font-mono text-xs text-red-600 dark:text-red-300">
                        {error.message}
                        {"\n\n"}
                        {error.stack}
                    </pre>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                    onClick={() => reset()}
                    className="flex items-center gap-2 rounded-xl bg-[var(--brand-primary-600)] px-8 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:bg-[var(--brand-primary-700)] active:scale-95"
                >
                    <RefreshCcw className="h-5 w-5" />
                    Try Again
                </button>

                <button
                    onClick={() => window.location.href = "/"}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-3 font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 active:scale-95"
                >
                    <Home className="h-5 w-5" />
                    Go to Dashboard
                </button>
            </div>
        </div>
    );
}
