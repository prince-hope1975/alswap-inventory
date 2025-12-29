"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { AlertCircle, TrendingUp } from "lucide-react";

interface SimilarProductsPanelProps {
    searchName: string;
    onUseProduct?: (product: any) => void;
}

export function SimilarProductsPanel({ searchName, onUseProduct }: SimilarProductsPanelProps) {
    const { formatCurrency } = useCurrency();
    const [debouncedName, setDebouncedName] = useState(searchName);

    // Debounce the search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedName(searchName);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchName]);

    const { data: similarProducts, isLoading } = api.inventory.findSimilarProducts.useQuery(
        {
            name: debouncedName,
            threshold: 0.6, // Lower threshold for more results
            limit: 5,
        },
        {
            enabled: debouncedName.length >= 3, // Only search if at least 3 characters
        }
    );

    if (!debouncedName || debouncedName.length < 3) {
        return null;
    }

    if (isLoading) {
        return (
            <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                <p className="text-sm text-blue-700 dark:text-blue-300">Searching for similar products...</p>
            </div>
        );
    }

    if (!similarProducts || similarProducts.length === 0) {
        return null;
    }

    return (
        <div className="mt-2 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
            <div className="mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Similar products found
                </h4>
            </div>
            <p className="mb-3 text-xs text-yellow-700 dark:text-yellow-300">
                These products have similar names. You might want to use one of these instead of creating a duplicate.
            </p>
            <div className="space-y-2">
                {similarProducts.map((product) => (
                    <div
                        key={product.id}
                        className="flex items-center justify-between rounded-md border border-yellow-300 bg-white p-3 dark:border-yellow-700 dark:bg-gray-800"
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                                    {Math.round(product.similarity * 100)}% match
                                </span>
                            </div>
                            <div className="mt-1 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                                {product.sku && <span>SKU: {product.sku}</span>}
                                <span>Stock: {product.stockQuantity === -1 ? "Unknown" : product.stockQuantity}</span>
                                <span>Price: {formatCurrency(parseFloat(product.price))}</span>
                            </div>
                        </div>
                        {onUseProduct && (
                            <button
                                type="button"
                                onClick={() => onUseProduct(product)}
                                className="ml-4 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                            >
                                Use This
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
