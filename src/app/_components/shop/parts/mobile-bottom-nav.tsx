"use client";

import { ShoppingCart, SlidersHorizontal, Search, Home } from "lucide-react";
import { useCart } from "../cart-context";

interface MobileBottomNavProps {
  onFilterClick: () => void;
  onSearchClick: () => void;
  onHomeClick: () => void;
  className?: string;
}

export function MobileBottomNav({
  onFilterClick,
  onSearchClick,
  onHomeClick,
  className = "",
}: MobileBottomNavProps) {
  const { totalItems, setIsCartOpen } = useCart();

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg lg:hidden ${className}`}>
      <div className="grid grid-cols-4 gap-1 px-2 py-2">
        {/* Home */}
        <button
          onClick={onHomeClick}
          className="flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Home className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Home</span>
        </button>

        {/* Search */}
        <button
          onClick={onSearchClick}
          className="flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Search className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Search</span>
        </button>

        {/* Filters */}
        <button
          onClick={onFilterClick}
          className="flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <SlidersHorizontal className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Filters</span>
        </button>

        {/* Cart */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold flex items-center justify-center">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Cart</span>
        </button>
      </div>
    </div>
  );
}
