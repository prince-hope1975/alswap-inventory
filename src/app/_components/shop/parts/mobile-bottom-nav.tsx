"use client";

import Link from "next/link";
import { ShoppingCart, SlidersHorizontal, Search, Home } from "lucide-react";
import { useCart } from "../cart-context";

interface MobileBottomNavProps {
  onFilterClick: () => void;
  onSearchClick: () => void;
  /** Number of active filters, shown as a badge on Filters. */
  activeFilterCount?: number;
  className?: string;
}

const itemClass =
  "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-[#41515c] transition-colors hover:bg-[#14212b]/5 focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:outline-none dark:text-gray-300 dark:hover:bg-white/10";

export function MobileBottomNav({
  onFilterClick,
  onSearchClick,
  activeFilterCount = 0,
  className = "",
}: MobileBottomNavProps) {
  const { totalItems, setIsCartOpen } = useCart();

  return (
    <nav
      aria-label="Shop shortcuts"
      className={`fixed right-0 bottom-0 left-0 z-40 border-t border-[#14212b]/15 bg-[#f6f4ee]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden dark:border-white/10 dark:bg-[#0a1117]/95 ${className}`}
    >
      <div className="grid grid-cols-4 gap-1 px-2 py-1">
        <Link href="/" className={itemClass}>
          <Home className="h-5 w-5" aria-hidden />
          <span className="text-[11px] font-medium">Home</span>
        </Link>

        <button type="button" onClick={onSearchClick} className={itemClass}>
          <Search className="h-5 w-5" aria-hidden />
          <span className="text-[11px] font-medium">Search</span>
        </button>

        <button
          type="button"
          onClick={onFilterClick}
          className={itemClass}
          aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : "Filters"}
        >
          <span className="relative">
            <SlidersHorizontal className="h-5 w-5" aria-hidden />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0b6e99] px-1 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </span>
          <span className="text-[11px] font-medium">Filters</span>
        </button>

        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className={itemClass}
          aria-label={totalItems > 0 ? `Cart, ${totalItems} item${totalItems === 1 ? "" : "s"}` : "Cart"}
        >
          <span className="relative">
            <ShoppingCart className="h-5 w-5" aria-hidden />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f5a623] px-1 text-[10px] font-bold text-[#14212b]">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </span>
          <span className="text-[11px] font-medium">Cart</span>
        </button>
      </div>
    </nav>
  );
}
