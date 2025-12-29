"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

export type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc" | "newest";

interface ShopFiltersProps {
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  inStockOnly: boolean;
  setInStockOnly: (value: boolean) => void;
  onClearFilters: () => void;
  maxPrice?: number;
  className?: string;
}

export function ShopFilters({
  priceRange,
  setPriceRange,
  sortBy,
  setSortBy,
  inStockOnly,
  setInStockOnly,
  onClearFilters,
  maxPrice = 1000000,
  className = "",
}: ShopFiltersProps) {
  const [localMinPrice, setLocalMinPrice] = useState(priceRange[0].toString());
  const [localMaxPrice, setLocalMaxPrice] = useState(priceRange[1].toString());

  const handleMinPriceChange = (value: string) => {
    setLocalMinPrice(value);
    const numValue = parseFloat(value) || 0;
    if (numValue >= 0 && numValue <= priceRange[1]) {
      setPriceRange([numValue, priceRange[1]]);
    }
  };

  const handleMaxPriceChange = (value: string) => {
    setLocalMaxPrice(value);
    const numValue = parseFloat(value) || maxPrice;
    if (numValue >= priceRange[0] && numValue <= maxPrice) {
      setPriceRange([priceRange[0], numValue]);
    }
  };

  const hasActiveFilters = 
    priceRange[0] > 0 || 
    priceRange[1] < maxPrice || 
    inStockOnly || 
    sortBy !== "newest";

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5" />
          <h3 className="font-semibold text-lg">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      {/* Sort By */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Sort By</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="newest">Newest First</option>
          <option value="name-asc">Name: A to Z</option>
          <option value="name-desc">Name: Z to A</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <label className="block text-sm font-medium">Price Range</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Min Price
            </label>
            <input
              type="number"
              value={localMinPrice}
              onChange={(e) => handleMinPriceChange(e.target.value)}
              onBlur={() => setLocalMinPrice(priceRange[0].toString())}
              min="0"
              max={priceRange[1]}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Max Price
            </label>
            <input
              type="number"
              value={localMaxPrice}
              onChange={(e) => handleMaxPriceChange(e.target.value)}
              onBlur={() => setLocalMaxPrice(priceRange[1].toString())}
              min={priceRange[0]}
              max={maxPrice}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder={maxPrice.toString()}
            />
          </div>
        </div>
        
        {/* Price Range Slider */}
        <div className="pt-2">
          <input
            type="range"
            min="0"
            max={maxPrice}
            value={priceRange[1]}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              if (value >= priceRange[0]) {
                setPriceRange([priceRange[0], value]);
                setLocalMaxPrice(value.toString());
              }
            }}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
        </div>
      </div>

      {/* Stock Availability */}
      <div className="space-y-2">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
          />
          <span className="text-sm font-medium group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            In Stock Only
          </span>
        </label>
      </div>
    </div>
  );
}
