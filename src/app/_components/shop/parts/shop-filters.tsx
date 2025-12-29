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
    <div className={`space-y-5 p-2 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <SlidersHorizontal className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="font-bold text-base text-gray-900 dark:text-white">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold flex items-center gap-1 hover:gap-1.5 transition-all"
          >
            <X className="h-3.5 w-3.5" />
            Clear All
          </button>
        )}
      </div>

      {/* Sort By */}
      <div className="space-y-2.5">
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Sort By
        </label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="w-full px-3.5 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:border-purple-500 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 transition-all cursor-pointer hover:border-gray-300 dark:hover:border-gray-600"
        >
          <option value="newest">⭐ Newest First</option>
          <option value="name-asc">🔤 Name: A to Z</option>
          <option value="name-desc">🔤 Name: Z to A</option>
          <option value="price-asc">💰 Price: Low to High</option>
          <option value="price-desc">💰 Price: High to Low</option>
        </select>
      </div>

      {/* Price Range */}
      <div className="space-y-3 pt-2">
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Price Range
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              Min
            </label>
            <input
              type="number"
              value={localMinPrice}
              onChange={(e) => handleMinPriceChange(e.target.value)}
              onBlur={() => setLocalMinPrice(priceRange[0].toString())}
              min="0"
              max={priceRange[1]}
              className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:border-purple-500 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 transition-all"
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              Max
            </label>
            <input
              type="number"
              value={localMaxPrice}
              onChange={(e) => handleMaxPriceChange(e.target.value)}
              onBlur={() => setLocalMaxPrice(priceRange[1].toString())}
              min={priceRange[0]}
              max={maxPrice}
              className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:border-purple-500 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 transition-all"
              placeholder={maxPrice.toString()}
            />
          </div>
        </div>
        
        {/* Price Range Slider */}
        <div className="pt-3 px-1">
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
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-purple-600 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg hover:[&::-webkit-slider-thumb]:bg-purple-700 transition-all"
          />
          <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
            <span>₦{priceRange[0].toLocaleString()}</span>
            <span>₦{priceRange[1].toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Stock Availability */}
      <div className="pt-2 pb-1">
        <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer transition-all"
          />
          <div className="flex-1">
            <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              In Stock Only
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Show available items
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}

