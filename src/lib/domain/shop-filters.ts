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

/**
 * Shopper-chosen price bounds; null = untouched, so nothing is excluded.
 * `max` may be Infinity ("no upper bound", e.g. only a minimum was typed).
 */
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
  // A max at (or past) the catalogue ceiling is "no upper bound", so it never
  // goes stale in a shared URL when pricier stock arrives.
  return { min, max: max >= ceiling && ceiling > 0 ? Number.POSITIVE_INFINITY : max };
}

/** Bounds for the `getProducts` input; both undefined when no filter is set. */
export function priceFilterToQuery(filter: PriceFilter): {
  minPrice?: number;
  maxPrice?: number;
} {
  if (!filter) return {};
  return {
    minPrice: filter.min > 0 ? filter.min : undefined,
    maxPrice: Number.isFinite(filter.max) ? filter.max : undefined,
  };
}

/** The [min, max] the price controls should display. */
export function priceFilterToRange(filter: PriceFilter, ceiling: number): [number, number] {
  if (!filter) return [0, ceiling];
  return [filter.min, Number.isFinite(filter.max) ? filter.max : Math.max(ceiling, filter.min)];
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

// --- URL state ---

/** Everything the /shop address bar carries besides `condition` and `src`. */
export type ShopUrlState = {
  search: string;
  categoryId: number | undefined;
  /** Explicit sort; null = the context default. */
  sort: ShopSortOption | null;
  price: PriceFilter;
  inStock: boolean;
};

type ParamSource =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function readParam(source: ParamSource, key: string): string | undefined {
  if (source instanceof URLSearchParams) return source.get(key) ?? undefined;
  const value = source[key];
  return Array.isArray(value) ? value[0] : value;
}

function readAmount(raw: string | undefined): number | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** Parse shop filters from a URL (server searchParams or client location). */
export function parseShopUrlState(source: ParamSource): ShopUrlState {
  const rawCategory = Number(readParam(source, "categoryId"));
  const minPrice = readAmount(readParam(source, "minPrice"));
  const maxPrice = readAmount(readParam(source, "maxPrice"));
  let price: PriceFilter = null;
  if ((minPrice ?? 0) > 0 || maxPrice != null) {
    const min = minPrice ?? 0;
    price = { min, max: maxPrice == null ? Number.POSITIVE_INFINITY : Math.max(min, maxPrice) };
  }
  const stock = readParam(source, "inStock");
  return {
    search: readParam(source, "search")?.trim() ?? "",
    categoryId: Number.isInteger(rawCategory) && rawCategory > 0 ? rawCategory : undefined,
    sort: parseShopSort(readParam(source, "sort")),
    price,
    inStock: stock === "1" || stock === "true",
  };
}

/**
 * Write shop filters into `base` (other params such as `condition` are kept).
 * Returns a new URLSearchParams; never mutates `base`.
 */
export function serializeShopUrlState(
  state: ShopUrlState,
  base: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  const params = new URLSearchParams(base);
  const set = (key: string, value: string | undefined) => {
    if (value) params.set(key, value);
    else params.delete(key);
  };
  set("search", state.search.trim() || undefined);
  set("categoryId", state.categoryId?.toString());
  set("sort", state.sort ?? undefined);
  const query = priceFilterToQuery(state.price);
  set("minPrice", query.minPrice != null ? String(query.minPrice) : undefined);
  set("maxPrice", query.maxPrice != null ? String(query.maxPrice) : undefined);
  set("inStock", state.inStock ? "1" : undefined);
  return params;
}

/**
 * How an address-bar update should be recorded. Discrete choices (category,
 * sort, stock toggle) get their own history entry so Back undoes them;
 * typing (search, price) replaces the current entry.
 */
export function shopHistoryMode(prev: ShopUrlState, next: ShopUrlState): "push" | "replace" {
  const discrete =
    prev.categoryId !== next.categoryId ||
    prev.sort !== next.sort ||
    prev.inStock !== next.inStock;
  return discrete ? "push" : "replace";
}

// --- Merchandising ---

/**
 * Ordering keys behind the SQL ORDER BY in `browseStorefrontProducts`, kept
 * here so the rule is unit tested: unpriced items (price on request) sink to
 * the end of price sorts, and the default "newest" sort shows products with a
 * photo first. Returns a negative/positive/zero comparator result.
 */
export type SortableProduct = {
  id: string;
  price: number;
  hasImage: boolean;
  createdAt: number;
  name: string;
};

export function compareForSort(sort: ShopSortOption, a: SortableProduct, b: SortableProduct): number {
  const byId = a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  const unpriced = (p: SortableProduct) => (p.price > 0 ? 0 : 1);
  switch (sort) {
    case "price-asc":
      return unpriced(a) - unpriced(b) || a.price - b.price || byId;
    case "price-desc":
      return unpriced(a) - unpriced(b) || b.price - a.price || byId;
    case "name-asc":
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || byId;
    case "name-desc":
      return b.name.toLowerCase().localeCompare(a.name.toLowerCase()) || byId;
    case "newest":
      return (a.hasImage ? 0 : 1) - (b.hasImage ? 0 : 1) || b.createdAt - a.createdAt || byId;
    case "relevance":
      return b.createdAt - a.createdAt || byId;
  }
}

/**
 * A description worth showing on a card or product page: trimmed, and null
 * when it is filler (shorter than ~15 characters, or just the product name).
 */
export function meaningfulDescription(
  description: string | null | undefined,
  name: string,
): string | null {
  const text = description?.trim().replace(/\s+/g, " ");
  if (!text || text.length < 15) return null;
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (normalize(text) === normalize(name)) return null;
  return text;
}
