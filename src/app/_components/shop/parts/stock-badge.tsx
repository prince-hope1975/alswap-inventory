"use client";

import { Package, AlertCircle, CheckCircle } from "lucide-react";

interface StockBadgeProps {
  stockQuantity: number | null | undefined;
  className?: string;
  lowStockThreshold?: number;
  /**
   * Show a quiet "Available" line for untracked stock (-1). Off on grid
   * cards, where the same label on every item is noise.
   */
  showUntracked?: boolean;
}

/**
 * Stock status. Only problems (sold out, running low) get a coloured pill;
 * plain availability is quiet text so it doesn't shout on every card.
 * Exact counts appear only when running low.
 */
export function StockBadge({
  stockQuantity,
  className = "",
  lowStockThreshold = 10,
  showUntracked = false,
}: StockBadgeProps) {
  const qty = stockQuantity ?? -1;
  const isOutOfStock = qty === 0;
  const isLowStock = qty > 0 && qty <= lowStockThreshold;

  if (isOutOfStock) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-[11px] font-semibold ${className}`}>
        <AlertCircle className="h-3 w-3" aria-hidden />
        Out of stock
      </div>
    );
  }

  if (isLowStock) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-[11px] font-semibold ${className}`}>
        <AlertCircle className="h-3 w-3" aria-hidden />
        Only {qty} left
      </div>
    );
  }

  if (qty > 0 || showUntracked) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs font-medium text-green-800 dark:text-green-400 ${className}`}>
        <CheckCircle className="h-3.5 w-3.5" aria-hidden />
        {qty > 0 ? "In stock" : "Available"}
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
