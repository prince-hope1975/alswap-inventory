import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** "← Products" back link + breadcrumb for product sub-pages. */
export function ProductsBackLink({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
        <li>
          <Link
            href="/inventory/products"
            className="inline-flex items-center gap-1 rounded-lg font-medium text-[var(--brand-primary-600)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] focus-visible:outline-none dark:text-[var(--brand-primary-400)]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Products
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="truncate">
          {current}
        </li>
      </ol>
    </nav>
  );
}
