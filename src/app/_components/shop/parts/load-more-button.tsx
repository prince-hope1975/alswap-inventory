"use client";

import { Loader2 } from "lucide-react";

interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading: boolean;
  hasMore: boolean;
  className?: string;
}

export function LoadMoreButton({ onClick, isLoading, hasMore, className = "" }: LoadMoreButtonProps) {
  if (!hasMore) return null;

  return (
    <div className={`flex justify-center ${className}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        aria-busy={isLoading}
        className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-[#0b6e99] bg-white px-8 font-semibold text-[#07597d] transition-colors hover:bg-[#dcecf2] focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#8dc5dc] dark:bg-transparent dark:text-[#8dc5dc] dark:hover:bg-white/5 dark:focus-visible:ring-offset-[#0a1117]"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading more…
          </>
        ) : (
          "Load more products"
        )}
      </button>
    </div>
  );
}
