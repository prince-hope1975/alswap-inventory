"use client";

import { Package, AlertCircle, CheckCircle } from "lucide-react";

interface StockBadgeProps {
  stockQuantity: number | null | undefined;
  className?: string;
  lowStockThreshold?: number;
}

export function StockBadge({ stockQuantity, className = "", lowStockThreshold = 10 }: StockBadgeProps) {
  const qty = stockQuantity ?? -1;
  const isOutOfStock = qty === 0;
  const isLowStock = qty > 0 && qty <= lowStockThreshold;
  const isInStock = qty === -1 || qty > lowStockThreshold;

  if (isOutOfStock) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold ${className}`}>
        <AlertCircle className="h-3.5 w-3.5" />
        Out of Stock
      </div>
    );
  }

  if (isLowStock) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-semibold ${className}`}>
        <AlertCircle className="h-3.5 w-3.5" />
        Only {qty} left
      </div>
    );
  }

  if (isInStock) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold ${className}`}>
        <CheckCircle className="h-3.5 w-3.5" />
        In Stock
      </div>
    );
  }

  return null;
}

interface StockIconProps {
  stockQuantity: number | null | undefined;
  className?: string;
  lowStockThreshold?: number;
}

export function StockIcon({ stockQuantity, className = "", lowStockThreshold = 10 }: StockIconProps) {
  const qty = stockQuantity ?? -1;
  const isOutOfStock = qty === 0;
  const isLowStock = qty > 0 && qty <= lowStockThreshold;

  if (isOutOfStock) {
    return <AlertCircle className={`text-red-600 dark:text-red-400 ${className}`} />;
  }

  if (isLowStock) {
    return <AlertCircle className={`text-orange-600 dark:text-orange-400 ${className}`} />;
  }

  return <Package className={`text-green-600 dark:text-green-400 ${className}`} />;
}
