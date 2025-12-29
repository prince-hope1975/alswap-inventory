"use client";

import { useEffect } from "react";
import { logger } from "~/lib/error-logger";

/**
 * Global error handler for errors that occur in the root layout.
 * Since this is the last resort, it must define its own <html> and <body> tags.
 */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        logger.log(error, { componentName: "CatastrophicGlobalError" });
    }, [error]);

    return (
        <html lang="en">
            <body className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-center font-sans dark:bg-gray-950 dark:text-white">
                <div className="max-w-md">
                    <div className="mb-6 flex justify-center text-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-alert"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
                    </div>
                    <h1 className="mb-4 text-3xl font-bold">Critical Error</h1>
                    <p className="mb-8 text-gray-600 dark:text-gray-400">
                        A critical error occurred that prevented the application from starting.
                        We've logged the error and are working on a fix.
                    </p>
                    <button
                        onClick={() => reset()}
                        className="rounded-lg bg-red-600 px-6 py-3 font-bold text-white transition-colors hover:bg-red-700"
                    >
                        Reset Application
                    </button>
                </div>
            </body>
        </html>
    );
}
