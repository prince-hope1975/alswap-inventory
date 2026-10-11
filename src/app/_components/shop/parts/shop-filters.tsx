"use client";

import { useEffect, useId, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useShopCurrency } from "~/hooks/use-tenant-settings";
import type { ShopSortOption } from "~/lib/domain/shop-filters";

export type SortOption = ShopSortOption;

export const SORT_LABELS: Record<ShopSortOption, string> = {
  relevance: "Best match",
  newest: "Newest first",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  "name-asc": "Name: A to Z",
  "name-desc": "Name: Z to A",
};

interface ShopFiltersProps {
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  inStockOnly: boolean;
  setInStockOnly: (value: boolean) => void;
  onClearFilters: () => void;
  /** Highest price in the current result set; the slider's upper bound. */
  maxPrice?: number;
  /** Shows "Best match" while a search is active. */
  hasSearch?: boolean;
  /** True once the shopper changed the price range. */
  isPriceFiltered?: boolean;
  /** Hide the built-in title when the container already has one (drawer). */
  hideHeader?: boolean;
  /** Hide the sort select when the page shows it in a results toolbar. */
  hideSort?: boolean;
  className?: string;
}

const inputClass =
  "w-full rounded-lg border border-[#14212b]/15 bg-white px-3 py-2.5 text-sm font-medium text-[#14212b] placeholder:text-[#6b767d] transition-colors focus:border-[#0b6e99] focus:ring-2 focus:ring-[#0b6e99]/60 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500";

export function ShopFilters({
  priceRange,
  setPriceRange,
  sortBy,
  setSortBy,
  inStockOnly,
  setInStockOnly,
  onClearFilters,
  maxPrice = 0,
  hasSearch = false,
  isPriceFiltered,
  hideHeader = false,
  hideSort = false,
  className = "",
}: ShopFiltersProps) {
  const id = useId();
  const { formatCurrency } = useShopCurrency();
  const priceActive = isPriceFiltered ?? (priceRange[0] > 0 || priceRange[1] < maxPrice);

  // Inputs are blank until the shopper types, and follow outside resets
  // (Clear all, chip removal).
  const [localMin, setLocalMin] = useState(priceActive && priceRange[0] > 0 ? String(priceRange[0]) : "");
  const [localMax, setLocalMax] = useState(priceActive ? String(priceRange[1]) : "");
  useEffect(() => {
    if (!priceActive) {
      setLocalMin("");
      setLocalMax("");
    }
  }, [priceActive]);
  // Follow outside changes (Back/Forward) unless the shopper is typing here.
  useEffect(() => {
    if (!priceActive) return;
    const active = typeof document !== "undefined" ? document.activeElement?.id : undefined;
    if (active === `${id}-min` || active === `${id}-max`) return;
    setLocalMin(priceRange[0] > 0 ? String(priceRange[0]) : "");
    setLocalMax(priceRange[1] < maxPrice ? String(priceRange[1]) : "");
  }, [priceActive, priceRange, maxPrice, id]);

  const commitMin = (value: string) => {
    setLocalMin(value);
    const num = Number(value);
    setPriceRange([value && Number.isFinite(num) ? Math.max(0, num) : 0, priceRange[1]]);
  };
  const commitMax = (value: string) => {
    setLocalMax(value);
    const num = Number(value);
    setPriceRange([priceRange[0], value && Number.isFinite(num) ? num : maxPrice]);
  };

  const defaultSort: SortOption = hasSearch ? "relevance" : "newest";
  const hasActiveFilters = priceActive || inStockOnly || sortBy !== defaultSort;
  const sortOptions = (Object.keys(SORT_LABELS) as SortOption[]).filter(
    (option) => option !== "relevance" || hasSearch,
  );

  return (
    <div className={`space-y-5 ${className}`}>
      {!hideHeader && (
        <div className="flex items-center justify-between border-b border-[#14212b]/10 pb-3 dark:border-white/10">
          <h3 className="flex items-center gap-2 text-base font-bold text-[#14212b] dark:text-white">
            <SlidersHorizontal className="h-4 w-4 text-[#0b6e99] dark:text-[#8dc5dc]" aria-hidden />
            Filters
          </h3>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              title="Reset price, stock and sort (keeps your search and category)"
              className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-semibold text-[#0b6e99] hover:bg-[#dcecf2] focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:outline-none dark:text-[#8dc5dc] dark:hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Reset filters
            </button>
          )}
        </div>
      )}

      {/* Sort */}
      {!hideSort && (
      <div className="space-y-2">
        <label
          htmlFor={`${id}-sort`}
          className="block text-xs font-semibold tracking-wide text-[#41515c] uppercase dark:text-gray-300"
        >
          Sort by
        </label>
        <select
          id={`${id}-sort`}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className={`${inputClass} cursor-pointer`}
        >
          {sortOptions.map((option) => (
            <option key={option} value={option}>
              {SORT_LABELS[option]}
            </option>
          ))}
        </select>
      </div>
      )}

      {/* Price */}
      <fieldset className="space-y-3">
        <legend className="mb-2 block text-xs font-semibold tracking-wide text-[#41515c] uppercase dark:text-gray-300">
          Price
        </legend>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label htmlFor={`${id}-min`} className="block text-xs font-medium text-[#5c6870] dark:text-gray-400">
              Min
            </label>
            <input
              id={`${id}-min`}
              type="number"
              inputMode="numeric"
              min={0}
              value={localMin}
              onChange={(e) => commitMin(e.target.value)}
              className={inputClass}
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={`${id}-max`} className="block text-xs font-medium text-[#5c6870] dark:text-gray-400">
              Max
            </label>
            <input
              id={`${id}-max`}
              type="number"
              inputMode="numeric"
              min={0}
              value={localMax}
              onChange={(e) => commitMax(e.target.value)}
              className={inputClass}
              placeholder={maxPrice > 0 ? String(maxPrice) : "Any"}
            />
          </div>
        </div>

        {maxPrice > 0 && (
          <div className="px-1 pt-1">
            <input
              type="range"
              aria-label="Maximum price"
              min={0}
              max={maxPrice}
              step={Math.max(1, Math.round(maxPrice / 200))}
              value={Math.min(priceRange[1], maxPrice)}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (value >= priceRange[0]) {
                  setPriceRange([priceRange[0], value]);
                  setLocalMax(value >= maxPrice ? "" : String(value));
                }
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#14212b]/10 accent-[#0b6e99] dark:bg-white/10"
            />
            <div className="mt-2 flex justify-between text-xs font-medium text-[#5c6870] dark:text-gray-400">
              <span>{formatCurrency(priceRange[0])}</span>
              <span>{formatCurrency(Math.min(priceRange[1], maxPrice))}</span>
            </div>
          </div>
        )}
      </fieldset>

      {/* Stock */}
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#14212b]/10 p-3 transition-colors hover:bg-[#dcecf2]/40 dark:border-white/10 dark:hover:bg-white/5">
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(e) => setInStockOnly(e.target.checked)}
          className="h-5 w-5 cursor-pointer rounded border-[#14212b]/30 accent-[#0b6e99]"
        />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-[#14212b] dark:text-white">In stock only</span>
          <span className="block text-xs text-[#5c6870] dark:text-gray-400">Hide sold-out items</span>
        </span>
      </label>
    </div>
  );
}
