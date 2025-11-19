"use client";

import Image from "next/image";
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
}

export function ProductCard({ product, onClick, className }: ProductCardProps) {
    const { formatCurrency } = useCurrency();
    const hasStock = product.stockQuantity > 0;

    return (
        <button
            onClick={onClick}
            disabled={!hasStock}
            className={cn(
                "group relative flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition-all hover:border-[var(--brand-primary-500)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-[var(--brand-primary-500)]",
                className
            )}
        >
            <div className="relative aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
                {product.image ? (
                    <img
                        src={product.image}
                        alt={product.name}
                        // fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-3xl font-bold text-gray-300 dark:text-gray-600">
                        {product.name.charAt(0).toUpperCase()}
                    </div>
                )}
                {!hasStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
                        <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                            Out of Stock
                        </span>
                    </div>
                )}
            </div>
            <div className="flex flex-1 flex-col p-3">
                <h3 className="line-clamp-2 text-sm font-medium text-gray-900 dark:text-white">
                    {product.name}
                </h3>
                <div className="mt-auto pt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {product.sku || "No SKU"}
                    </p>
                    <p className="text-lg font-bold text-[var(--brand-primary-600)] dark:text-[var(--brand-primary-400)]">
                        {formatCurrency(product.price)}
                    </p>
                </div>
            </div>
        </button>
    );
}

