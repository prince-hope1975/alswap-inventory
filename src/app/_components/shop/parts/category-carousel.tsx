"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Category {
  id: number;
  name: string;
  productCount?: number;
}

interface CategoryCarouselProps {
  categories: Category[] | undefined;
  selectedCategory: number | undefined;
  setSelectedCategory: (id: number | undefined) => void;
  className?: string;
}

/** Arrows appear only once the row has really moved, not on sub-pixel offsets. */
const EDGE = 8;

function chipClass(active: boolean) {
  return `inline-flex min-h-10 shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-[#0a1117] ${
    active
      ? "border-[#0b6e99] bg-[#0b6e99] text-white"
      : "border-[#14212b]/15 bg-white text-[#14212b] hover:border-[#0b6e99] dark:border-white/15 dark:bg-white/5 dark:text-gray-200"
  }`;
}

const arrowClass =
  "absolute top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-[#14212b]/10 bg-white text-[#14212b] shadow-md transition-colors hover:bg-[#dcecf2] focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:outline-none dark:border-white/10 dark:bg-[#0f1a22] dark:text-gray-200 dark:hover:bg-[#112b3c]";

export function CategoryCarousel({
  categories,
  selectedCategory,
  setSelectedCategory,
  className = "",
}: CategoryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > EDGE);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - EDGE);
  }, []);

  useEffect(() => {
    // Scroll snapping can leave the row a couple of pixels in, which used to
    // show the left arrow on top of "All products".
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [categories, checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: (direction === "left" ? -1 : 1) * Math.max(160, el.clientWidth * 0.7),
      behavior: "smooth",
    });
  };

  if (!categories || categories.length === 0) return null;

  return (
    <div className={`relative ${className}`}>
      {canScrollLeft && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-12 bg-gradient-to-r from-[#f6f4ee] to-transparent dark:from-[#0a1117]"
          />
          <button
            type="button"
            onClick={() => scroll("left")}
            className={`${arrowClass} left-0`}
            aria-label="Scroll categories left"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
        </>
      )}

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        role="group"
        aria-label="Shop by category"
        className="flex snap-x scroll-px-1 gap-2 overflow-x-auto px-1 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          onClick={() => setSelectedCategory(undefined)}
          aria-pressed={selectedCategory === undefined}
          className={chipClass(selectedCategory === undefined)}
        >
          All products
        </button>

        {categories.map((category) => {
          const active = selectedCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.id)}
              aria-pressed={active}
              className={chipClass(active)}
            >
              {category.name}
              {category.productCount != null && (
                <span className={`text-xs ${active ? "text-white/80" : "text-[#5c6870] dark:text-gray-400"}`}>
                  {category.productCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {canScrollRight && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-12 bg-gradient-to-l from-[#f6f4ee] to-transparent dark:from-[#0a1117]"
          />
          <button
            type="button"
            onClick={() => scroll("right")}
            className={`${arrowClass} right-0`}
            aria-label="Scroll categories right"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}
