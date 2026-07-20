"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeroSlide {
  title: string;
  description: string;
  image?: string;
  ctaText?: string;
  ctaAction?: () => void;
}

interface MarketplaceHeroCarouselProps {
  slides: HeroSlide[];
  autoPlayInterval?: number;
}

export function MarketplaceHeroCarousel({
  slides,
  autoPlayInterval = 5000,
}: MarketplaceHeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;

    const interval = setInterval(nextSlide, autoPlayInterval);
    return () => clearInterval(interval);
  }, [nextSlide, autoPlayInterval, slides.length]);

  if (slides.length === 0) return null;

  const currentSlide = slides[currentIndex];

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg bg-gray-900">
      {currentSlide?.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentSlide.image}
          alt={currentSlide.title}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />

      <div className="relative z-10 h-full flex flex-col justify-center p-8 md:p-12 text-white">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 max-w-lg">
          {currentSlide?.title}
        </h2>
        <p className="text-lg mb-6 max-w-md opacity-90">
          {currentSlide?.description}
        </p>
        {currentSlide?.ctaText && currentSlide?.ctaAction && (
          <button
            onClick={currentSlide.ctaAction}
            className="bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white px-8 py-3 rounded-lg shadow-lg w-fit font-bold transition-colors"
          >
            {currentSlide.ctaText}
          </button>
        )}
      </div>

      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex
                    ? "bg-white w-8"
                    : "bg-white/50 hover:bg-white/75"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
