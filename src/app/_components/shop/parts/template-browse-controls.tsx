"use client";

import { useId, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import type { StoreTemplateProps } from "../templates/modern-template";
import { SORT_LABELS } from "./shop-filters";
import { MobileFilterDrawer } from "./mobile-filter-drawer";
import { ShopFilters } from "./shop-filters";
import { LoadMoreButton } from "./load-more-button";
import { useShopCurrency } from "~/hooks/use-tenant-settings";

const controlClass =
  "min-h-11 rounded-lg border border-current/20 bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)]";

/** Keeps each template's product grid while sharing controller-driven browse actions. */
export function TemplateBrowseControls(
  props: StoreTemplateProps & { children: ReactNode; desktopFilters?: boolean },
) {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const filtersId = useId();
  const sortId = useId();
  const { formatCurrency } = useShopCurrency();
  const {
    products,
    totalCount,
    search,
    selectedCategory,
    categories,
    sortBy,
    priceRange,
    maxPrice = 0,
    isPriceFiltered = false,
    inStockOnly,
    hasSearch = false,
    isLoading,
    isRefreshing = false,
    loadError,
    onRetry,
    hasMore = false,
    isFetchingMore = false,
    onLoadMore,
  } = props;
  const shown = products?.length ?? 0;
  const total = totalCount ?? shown;
  const category = categories?.find(
    (item) => item.id === selectedCategory,
  )?.name;
  const clearAll = () => {
    props.setSearch("");
    props.setSelectedCategory(undefined);
    props.onClearFilters();
  };
  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (search.trim())
    chips.push({
      key: "search",
      label: `Search: ${search.trim()}`,
      remove: () => props.setSearch(""),
    });
  if (selectedCategory !== undefined)
    chips.push({
      key: "category",
      label: category ?? "Category",
      remove: () => props.setSelectedCategory(undefined),
    });
  if (isPriceFiltered)
    chips.push({
      key: "price",
      label: `${formatCurrency(priceRange[0])} – ${formatCurrency(priceRange[1])}`,
      remove: () => props.setPriceRange([0, maxPrice]),
    });
  if (inStockOnly)
    chips.push({
      key: "stock",
      label: "In stock",
      remove: () => props.setInStockOnly(false),
    });
  const defaultSort = hasSearch ? "relevance" : "newest";
  if (sortBy !== defaultSort)
    chips.push({
      key: "sort",
      label: `Sort: ${SORT_LABELS[sortBy]}`,
      remove: () => props.setSortBy(defaultSort),
    });

  return (
    <>
      <div className="my-5 flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm">
          {isLoading
            ? "Loading products…"
            : `${total} product${total === 1 ? "" : "s"}`}
          {isRefreshing && <span className="ml-2">Updating results…</span>}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
            aria-haspopup="dialog"
            className={`${controlClass} lg:hidden`}
          >
            Filters
          </button>
          {props.desktopFilters !== false && (
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-controls={filtersId}
              className={`${controlClass} hidden lg:inline-flex lg:items-center`}
            >
              {open ? "Hide filters" : "Show filters"}
            </button>
          )}
          <label htmlFor={sortId} className="sr-only">
            Sort by
          </label>
          <select
            id={sortId}
            value={sortBy}
            onChange={(event) => {
              const option = event.target.value;
              if (
                option === "relevance" ||
                option === "newest" ||
                option === "price-asc" ||
                option === "price-desc" ||
                option === "name-asc" ||
                option === "name-desc"
              )
                props.setSortBy(option);
            }}
            className={controlClass}
          >
            {Object.entries(SORT_LABELS)
              .filter(([key]) => key !== "relevance" || hasSearch)
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </select>
        </div>
      </div>
      {chips.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              aria-label={`Remove filter ${chip.label}`}
              onClick={chip.remove}
              className={`${controlClass} inline-flex items-center gap-2 rounded-full`}
            >
              {chip.label}
              <X aria-hidden className="h-4 w-4" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className={`${controlClass} underline`}
          >
            Clear all
          </button>
        </div>
      )}
      {open && props.desktopFilters !== false && (
        <div
          id={filtersId}
          className="mb-6 hidden rounded-xl border border-current/15 p-5 lg:block"
        >
          <ShopFilters
            {...props}
            hideSort
            maxPrice={maxPrice}
            hasSearch={hasSearch}
            isPriceFiltered={isPriceFiltered}
            onClearFilters={clearAll}
          />
        </div>
      )}
      <MobileFilterDrawer
        {...props}
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        maxPrice={maxPrice}
        hasSearch={hasSearch}
        isPriceFiltered={isPriceFiltered}
        onClearFilters={clearAll}
        resultCount={total}
      />
      {loadError && (
        <div
          role="alert"
          className="my-6 rounded-xl border border-current/20 p-6 text-center"
        >
          <p>We couldn&apos;t load products. Try again.</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isLoading || isRefreshing || isFetchingMore}
              className={`${controlClass} mt-3`}
            >
              Try again
            </button>
          )}
        </div>
      )}
      {(!loadError || shown > 0) && (
        <div
          aria-busy={isLoading || isRefreshing}
          className={isRefreshing ? "opacity-60" : undefined}
        >
          {props.children}
          {!isLoading && shown === 0 && (
            <p className="py-6 text-center">No products match these filters.</p>
          )}
        </div>
      )}
      {!isLoading && shown > 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 pb-6">
          <p className="text-sm">
            Showing {shown} of {total}
          </p>
          {onLoadMore && (
            <LoadMoreButton
              onClick={onLoadMore}
              isLoading={isFetchingMore || isRefreshing}
              hasMore={hasMore}
            />
          )}
        </div>
      )}
    </>
  );
}
