"use client";

import { useEffect } from "react";
import { logger } from "~/lib/error-logger";
import { Package, RefreshCcw, LayoutDashboard, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function InventoryError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        logger.log(error, { componentName: "InventoryRouteError", route: "/inventory" });
    }, [error]);

    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-red-100 bg-white p-12 text-center shadow-sm dark:border-red-900/20 dark:bg-gray-900">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                <Package className="h-10 w-10" />
            </div>

            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                Inventory Dashboard Error
            </h1>

            <p className="mb-8 max-w-md text-gray-600 dark:text-gray-400">
                We couldn&apos;t load the inventory data. This might be a temporary connection issue.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                    onClick={() => reset()}
                    className="flex items-center gap-2 rounded-lg bg-[var(--brand-primary-600)] px-6 py-2.5 font-semibold text-white shadow-md transition-all hover:bg-[var(--brand-primary-700)] active:scale-95"
                >
                    <RefreshCcw className="h-4 w-4" />
                    Retry Loading
                </button>

                <Link
                    href="/inventory"
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-2.5 font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200 active:scale-95"
                >
                    <LayoutDashboard className="h-4 w-4" />
                    Back to Dashboard
                </Link>
            </div>
        </div>
    );
}
