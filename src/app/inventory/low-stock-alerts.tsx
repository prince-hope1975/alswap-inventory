"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { AlertTriangle, X } from "lucide-react";
import Link from "next/link";

export function LowStockAlerts() {
    const [isOpen, setIsOpen] = useState(true);
    const { data: lowStockProducts } = api.inventory.getLowStockProducts.useQuery(undefined, {
        refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    });

    if (!lowStockProducts || lowStockProducts.length === 0 || !isOpen) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-red-200 bg-white p-4 shadow-lg dark:border-red-900/50 dark:bg-gray-900">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                    <h3 className="font-semibold">Low Stock Alert</h3>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                You have {lowStockProducts.length} items running low on stock.
            </p>
            <ul className="mt-2 max-h-32 overflow-y-auto text-sm text-gray-500 dark:text-gray-400">
                {lowStockProducts.slice(0, 3).map((product) => (
                    <li key={product.id} className="flex justify-between py-1">
                        <span className="truncate">{product.name}</span>
                        <span className="font-medium text-red-500">{product.stockQuantity} left</span>
                    </li>
                ))}
                {lowStockProducts.length > 3 && (
                    <li className="pt-1 text-xs italic">...and {lowStockProducts.length - 3} more</li>
                )}
            </ul>
            <div className="mt-3">
                <Link
                    href="/inventory/products"
                    className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    onClick={() => setIsOpen(false)}
                >
                    View all products &rarr;
                </Link>
            </div>
        </div>
    );
}

