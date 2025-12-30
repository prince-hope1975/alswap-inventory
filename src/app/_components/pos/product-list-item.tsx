"use client";

import { Package, Plus } from "lucide-react";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { cn } from "~/lib/utils";

interface ProductListItemProps {
    product: {
        id: string;
        name: string;
        price: number;
        image: string | null;
        stockQuantity: number;
        sku?: string | null;
    };
    onClick: () => void;
    className?: string;
}

export function ProductListItem({ product, onClick, className }: ProductListItemProps) {
    const { formatCurrency } = useCurrency();
    
    const isOutOfStock = product.stockQuantity === 0;
    const hasKnownStock = product.stockQuantity > 0;
    const stockDisplay = hasKnownStock 
        ? `${product.stockQuantity} in stock`
        : product.stockQuantity === -1 
            ? "In Stock" 
            : "Out of Stock";

    return (
        <button
            onClick={onClick}
            disabled={isOutOfStock}
            className={cn(
                "group flex w-full items-center gap-4 rounded-lg border bg-white p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60",
                "border-gray-200 hover:border-[var(--brand-primary-400)] hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-[var(--brand-primary-500)]",
                className
            )}
        >
            {/* Product Image/Icon */}
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                {product.image ? (
                    <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <Package className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                    </div>
                )}
            </div>

            {/* Product Details */}
            <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {product.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {product.sku || "No SKU"}
                </p>
            </div>

            {/* Price & Stock */}
            <div className="flex flex-col items-end gap-1">
                <p className="text-lg font-bold text-[var(--brand-primary-600)] dark:text-[var(--brand-primary-400)]">
                    {formatCurrency(product.price)}
                </p>
                <span className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                    isOutOfStock
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : hasKnownStock 
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                )}>
                    {stockDisplay}
                </span>
            </div>

            {/* Add Button */}
            {!isOutOfStock && (
                <div className="flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-primary-600)] text-white transition-colors group-hover:bg-[var(--brand-primary-700)]">
                        <Plus className="h-5 w-5" />
                    </div>
                </div>
            )}
        </button>
    );
}
