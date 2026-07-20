"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  const maxVisiblePages = 7;

  if (totalPages <= maxVisiblePages) {
    // Show all pages if total is small
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Show smart pagination with ellipsis
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
  }

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Page Numbers */}
      {pages.map((page, index) => {
        if (page === "...") {
          return (
            <span
              key={`ellipsis-${index}`}
              className="px-3 py-2 text-gray-500 dark:text-gray-400"
            >
              ...
            </span>
          );
        }

        return (
          <button
            key={page}
            onClick={() => onPageChange(page as number)}
            className={`min-w-[40px] px-3 py-2 rounded-lg font-medium transition-colors ${
              currentPage === page
                ? "bg-[#0b6e99] text-white shadow-lg shadow-[#167da8]/25"
                : "border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {page}
          </button>
        );
      })}

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Next page"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
