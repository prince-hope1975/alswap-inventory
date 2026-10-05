"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

import { api } from "~/trpc/react";

const LOW_STOCK_HREF = "/inventory/products?stock=low";
const DISMISS_KEY = "low-stock-alert-dismissed";

/** getLowStockProducts returns at most this many rows. */
const LOW_STOCK_LIMIT = 20;

export function LowStockAlerts() {
    const pathname = usePathname();
    const [dismissed, setDismissed] = useState(false);
    const { data: lowStockProducts } = api.inventory.getLowStockProducts.useQuery(undefined, {
        refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    });

    // Remember the dismissal for this browser session only.
    useEffect(() => {
        try {
            if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
        } catch {
            /* storage unavailable: show the alert */
        }
    }, []);

    const dismiss = () => {
        setDismissed(true);
        try {
            sessionStorage.setItem(DISMISS_KEY, "1");
        } catch {
            /* ignore */
        }
    };

    // Not useful on the products list itself, where the filter already shows it.
    if (!lowStockProducts || lowStockProducts.length === 0 || dismissed || pathname.startsWith("/inventory/products")) {
        return null;
    }

    const count = lowStockProducts.length;
    const countLabel = count >= LOW_STOCK_LIMIT ? `${LOW_STOCK_LIMIT}+` : String(count);

    return (
        <>
            {/* Mobile: a compact pill so it never covers page content. */}
            <div className="fixed right-4 bottom-4 z-40 flex items-center gap-1 rounded-full border border-red-200 bg-white py-1 pr-1 pl-3 text-sm shadow-lg md:hidden dark:border-red-900/50 dark:bg-gray-900">
                <Link
                    href={LOW_STOCK_HREF}
                    className="flex items-center gap-1.5 font-medium text-red-600 dark:text-red-400"
                >
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    {countLabel} low stock
                </Link>
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Dismiss low stock alert"
                    className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Desktop card */}
            <div
                role="status"
                className="fixed right-4 bottom-4 z-40 hidden w-80 rounded-lg border border-red-200 bg-white p-4 shadow-lg md:block dark:border-red-900/50 dark:bg-gray-900"
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                        <h3 className="font-semibold">Low Stock Alert</h3>
                    </div>
                    <button
                        type="button"
                        onClick={dismiss}
                        aria-label="Dismiss low stock alert"
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {countLabel} item{count === 1 ? " is" : "s are"} running low on stock.
                </p>
                <ul className="mt-2 max-h-32 overflow-y-auto text-sm text-gray-500 dark:text-gray-400">
                    {lowStockProducts.slice(0, 3).map((product) => (
                        <li key={product.id} className="flex justify-between gap-3 py-1">
                            <span className="truncate">{product.name}</span>
                            <span className="shrink-0 font-medium text-red-500">
                                {product.stockQuantity === 0 ? "Out" : `${product.stockQuantity} left`}
                            </span>
                        </li>
                    ))}
                    {count > 3 && (
                        <li className="pt-1 text-xs italic">...and {count >= LOW_STOCK_LIMIT ? "more" : `${count - 3} more`}</li>
                    )}
                </ul>
                <div className="mt-3">
                    <Link
                        href={LOW_STOCK_HREF}
                        className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                        View low stock products &rarr;
                    </Link>
                </div>
            </div>
        </>
    );
}
