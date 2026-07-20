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
        onClick={onClick}
        disabled={isLoading}
        className="px-8 py-3 rounded-xl bg-[#0b6e99] hover:bg-[#07597d] text-white font-semibold shadow-lg shadow-[#167da8]/25 hover:shadow-[#167da8]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:scale-[1.02]"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading...
          </>
        ) : (
          "Load More Products"
        )}
      </button>
    </div>
  );
}
