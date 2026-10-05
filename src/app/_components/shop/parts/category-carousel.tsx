"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";

interface Category {
  id: number;
  name: string;
}

interface CategoryCarouselProps {
  categories: Category[] | undefined;
  selectedCategory: number | undefined;
  setSelectedCategory: (id: number | undefined) => void;
  className?: string;
}

export function CategoryCarousel({
  categories,
  selectedCategory,
  setSelectedCategory,
  className = "",
}: CategoryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [categories]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 300);
    }
  };

  if (!categories || categories.length === 0) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Left Arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-2 overflow-x-auto scrollbar-hide snap-x px-0.5 py-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* All Products */}
        <button
          onClick={() => setSelectedCategory(undefined)}
          aria-pressed={selectedCategory === undefined}
          className={`flex-shrink-0 min-h-10 border px-4 py-2 rounded-full text-sm font-medium transition-colors snap-start ${
            selectedCategory === undefined
              ? "border-[#0b6e99] bg-[#0b6e99] text-white"
              : "border-[#14212b]/15 bg-white text-[#14212b] hover:border-[#0b6e99] dark:border-white/15 dark:bg-white/5 dark:text-gray-200"
          }`}
        >
          All products
        </button>

        {/* Categories */}
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            aria-pressed={selectedCategory === category.id}
            className={`flex-shrink-0 min-h-10 border px-4 py-2 rounded-full text-sm font-medium transition-colors snap-start whitespace-nowrap ${
              selectedCategory === category.id
                ? "border-[#0b6e99] bg-[#0b6e99] text-white"
                : "border-[#14212b]/15 bg-white text-[#14212b] hover:border-[#0b6e99] dark:border-white/15 dark:bg-white/5 dark:text-gray-200"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Right Arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>
      )}

      {/* Hide scrollbar */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
