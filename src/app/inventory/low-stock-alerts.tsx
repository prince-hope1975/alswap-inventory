"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";

const LOW_STOCK_HREF = "/inventory/products?stock=low";

/** getLowStockProducts returns at most this many rows. */
const LOW_STOCK_LIMIT = 20;

function useLowStockCount(enabled: boolean) {
    const { data } = api.inventory.getLowStockProducts.useQuery(undefined, {
        refetchInterval: 1000 * 60 * 5,
        enabled,
    });
    const count = data?.length ?? 0;
    return { count, label: count >= LOW_STOCK_LIMIT ? `${LOW_STOCK_LIMIT}+` : String(count) };
}

/**
 * Low-stock indicator that lives in the shell (sidebar / mobile header)
 * instead of floating over page content. Renders nothing when stock is fine.
 */
export function LowStockAlert({
    enabled,
    compact = false,
    onNavigate,
}: {
    /** Managers only: the query is manager-gated. */
    enabled: boolean;
    /** Icon + count only (mobile header). */
    compact?: boolean;
    onNavigate?: () => void;
}) {
    const { count, label } = useLowStockCount(enabled);
    if (!enabled || count === 0) return null;
    const text = `${label} product${count === 1 ? "" : "s"} low on stock`;

    if (compact) {
        return (
            <Link
                href={LOW_STOCK_HREF}
                onClick={onNavigate}
                aria-label={text}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] focus-visible:outline-none dark:text-red-400 dark:hover:bg-red-900/20"
            >
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] leading-5 font-bold text-white">
                    {label}
                </span>
            </Link>
        );
    }

    return (
        <Link
            href={LOW_STOCK_HREF}
            onClick={onNavigate}
            className={cn(
                "flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100",
                "focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] focus-visible:outline-none",
                "dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30",
            )}
        >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{text}</span>
            <span aria-hidden="true">&rarr;</span>
        </Link>
    );
}
