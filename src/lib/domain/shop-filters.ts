/**
 * Pure storefront browse rules shared by the `/shop` server page, the client
 * store layout and the `shop.getProducts` procedure, so the server prefetch and
 * the client's first page build the exact same query.
 */

/** One page of the storefront grid; server prefetch and client must agree. */
export const SHOP_PAGE_SIZE = 24;

export const SHOP_SORT_OPTIONS = [
  "relevance",
  "newest",
  "price-asc",
  "price-desc",
  "name-asc",
  "name-desc",
] as const;

export type ShopSortOption = (typeof SHOP_SORT_OPTIONS)[number];

export function parseShopSort(raw: string | null | undefined): ShopSortOption | null {
  return SHOP_SORT_OPTIONS.includes(raw as ShopSortOption)
    ? (raw as ShopSortOption)
    : null;
}

/**
 * The sort actually applied. `choice` is what the shopper picked (null = never
 * touched). While a search is active the default is relevance; relevance means
 * nothing without a search term, so it falls back to newest.
 */
export function resolveShopSort(
  choice: ShopSortOption | null | undefined,
  hasSearch: boolean,
): ShopSortOption {
  if (!choice) return hasSearch ? "relevance" : "newest";
  if (choice === "relevance" && !hasSearch) return "newest";
  return choice;
}

/** Shopper-chosen price bounds; null = untouched, so nothing is excluded. */
export type PriceFilter = { min: number; max: number } | null;

/**
 * Turn a slider/input range into a filter. A range that spans the whole
 * catalogue (0 to the real max price) is the same as no filter, so the
 * default never hides expensive items (inverters, panels) or unpriced ones.
 */
export function normalizePriceFilter(
  range: readonly [number, number],
  ceiling: number,
): PriceFilter {
  const min = Math.max(0, Number.isFinite(range[0]) ? range[0] : 0);
  const rawMax = Number.isFinite(range[1]) ? range[1] : ceiling;
  const max = Math.max(min, rawMax);
  if (min <= 0 && max >= ceiling) return null;
  return { min, max };
}

/** Bounds for the `getProducts` input; both undefined when no filter is set. */
export function priceFilterToQuery(filter: PriceFilter): {
  minPrice?: number;
  maxPrice?: number;
} {
  if (!filter) return {};
  return {
    minPrice: filter.min > 0 ? filter.min : undefined,
    maxPrice: filter.max,
  };
}

/** The [min, max] the price controls should display. */
export function priceFilterToRange(filter: PriceFilter, ceiling: number): [number, number] {
  return filter ? [filter.min, filter.max] : [0, ceiling];
}

/**
 * Display name for a category: upper-cases the first letter of each all-
 * lowercase word and never lower-cases anything, so acronyms and mixed-case
 * units (LED, MCB, PVC, kVA) survive.
 */
export function toDisplayCategoryName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\s/()-]+/g, (word) =>
      /[A-Z]/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1),
    );
}
