"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import { useDialogA11y } from "~/hooks/use-dialog-a11y";
import { ShopFilters, type SortOption } from "./shop-filters";

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  maxPrice?: number;
  hasSearch?: boolean;
  isPriceFiltered?: boolean;
  inStockOnly: boolean;
  setInStockOnly: (value: boolean) => void;
  onClearFilters: () => void;
  categories?: Array<{ id: number; name: string; productCount?: number }>;
  selectedCategory: number | undefined;
  setSelectedCategory: (id: number | undefined) => void;
  /** Result count for the "Show N results" button. */
  resultCount?: number;
}

function chipClass(active: boolean) {
  return `min-h-10 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-[#0f1a22] ${
    active
      ? "border-[#0b6e99] bg-[#0b6e99] text-white"
      : "border-[#14212b]/15 bg-white text-[#14212b] hover:border-[#0b6e99] dark:border-white/15 dark:bg-white/5 dark:text-gray-200"
  }`;
}

export function MobileFilterDrawer({
  isOpen,
  onClose,
  sortBy,
  setSortBy,
  priceRange,
  setPriceRange,
  maxPrice,
  hasSearch,
  isPriceFiltered,
  inStockOnly,
  setInStockOnly,
  onClearFilters,
  categories,
  selectedCategory,
  setSelectedCategory,
  resultCount,
}: MobileFilterDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useDialogA11y({ open: isOpen, onClose, panelRef, initialFocusRef: closeRef });

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
        onClick={onClose}
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-filter-title"
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl bg-[#f6f4ee] shadow-2xl focus:outline-none lg:hidden dark:bg-[#0f1a22]"
      >
        <div className="flex items-center justify-between border-b border-[#14212b]/10 px-4 py-3 dark:border-white/10">
          <h2 id="mobile-filter-title" className="text-lg font-bold text-[#14212b] dark:text-white">
            Filter & sort
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[#14212b]/5 focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:outline-none dark:hover:bg-white/10"
          >
            <X className="h-5 w-5 text-[#41515c] dark:text-gray-300" aria-hidden />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          {categories && categories.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wide text-[#41515c] uppercase dark:text-gray-300">
                Category
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={selectedCategory === undefined}
                  onClick={() => setSelectedCategory(undefined)}
                  className={chipClass(selectedCategory === undefined)}
                >
                  All products
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={selectedCategory === category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={chipClass(selectedCategory === category.id)}
                  >
                    {category.name}
                    {category.productCount != null && (
                      <span className="ml-1.5 text-xs opacity-70">{category.productCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ShopFilters
            hideHeader
            sortBy={sortBy}
            setSortBy={setSortBy}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            maxPrice={maxPrice}
            hasSearch={hasSearch}
            isPriceFiltered={isPriceFiltered}
            inStockOnly={inStockOnly}
            setInStockOnly={setInStockOnly}
            onClearFilters={onClearFilters}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-[#14212b]/10 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:border-white/10">
          <button
            type="button"
            onClick={() => {
              onClearFilters();
              setSelectedCategory(undefined);
            }}
            className="min-h-11 rounded-xl border border-[#14212b]/20 font-semibold text-[#14212b] hover:bg-[#14212b]/5 focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:outline-none dark:border-white/20 dark:text-white dark:hover:bg-white/10"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl bg-[#f5a623] font-bold text-[#14212b] hover:bg-[#ffc04d] focus-visible:ring-2 focus-visible:ring-[#14212b] focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-white dark:focus-visible:ring-offset-[#0f1a22]"
          >
            {resultCount != null ? `Show ${resultCount} result${resultCount === 1 ? "" : "s"}` : "Show results"}
          </button>
        </div>
      </div>
    </>
  );
}
