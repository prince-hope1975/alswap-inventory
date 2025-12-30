"use client";

import { Package } from "lucide-react";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { cn } from "~/lib/utils";

interface ProductCardProps {
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
    touchMode?: boolean;
}

export function ProductCard({ product, onClick, className, touchMode = false }: ProductCardProps) {
    const { formatCurrency } = useCurrency();
    
    // Fix stock logic: 0 = out of stock, -1 = unknown (in stock), > 0 = in stock with quantity
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
                "group relative flex h-full flex-col overflow-hidden rounded-xl border bg-white text-left transition-all disabled:cursor-not-allowed disabled:opacity-60",
                // Enhanced shadows and hover states
                "border-gray-200 shadow-sm hover:shadow-lg dark:border-gray-700 dark:bg-gray-800",
                "hover:border-[var(--brand-primary-400)] hover:-translate-y-0.5",
                "dark:hover:border-[var(--brand-primary-500)]",
                "active:translate-y-0 active:shadow-md",
                className
            )}
        >
            <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                {product.image ? (
                    <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <Package className={cn(
                            "text-gray-300 dark:text-gray-600",
                            touchMode ? "h-16 w-16" : "h-12 w-12"
                        )} />
                    </div>
                )}
                {isOutOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <span className="rounded-full bg-red-500 px-4 py-1.5 text-sm font-bold text-white shadow-lg">
                            Out of Stock
                        </span>
                    </div>
                )}
            </div>
            <div className="flex flex-1 flex-col p-3">
                <h3 className={cn(
                    "line-clamp-2 font-medium text-gray-900 dark:text-white",
                    touchMode ? "text-base" : "text-sm"
                )}>
                    {product.name}
                </h3>
                <div className="mt-auto space-y-1 pt-2">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {product.sku || "No SKU"}
                        </p>
                        {!isOutOfStock && (
                            <span className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                                hasKnownStock 
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            )}>
                                {stockDisplay}
                            </span>
                        )}
                    </div>
                    <p className={cn(
                        "font-bold text-[var(--brand-primary-600)] dark:text-[var(--brand-primary-400)]",
                        touchMode ? "text-xl" : "text-lg"
                    )}>
                        {formatCurrency(product.price)}
                    </p>
                </div>
            </div>
        </button>
    );
}

