/**
 * URL state for the staff products list (/inventory/products). Parsing is
 * defensive: anything unknown falls back to the default so a hand-edited URL
 * never breaks the page.
 */

export const PRODUCT_LIST_SORTS = ["newest", "name", "stock-asc", "stock-desc", "price-asc", "price-desc"] as const;
export type ProductListSort = (typeof PRODUCT_LIST_SORTS)[number];

export const PRODUCT_LIST_STOCK = ["low", "out", "untracked"] as const;
export type ProductListStock = (typeof PRODUCT_LIST_STOCK)[number];

export const PRODUCT_LIST_PAGE_SIZE = 50;

export type ProductListParams = {
  search?: string;
  hasImage?: boolean;
  stock?: ProductListStock;
  sort: ProductListSort;
  categoryId?: number;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseProductListParams(raw: RawParams): ProductListParams {
  const searchRaw = first(raw.search)?.trim();
  const search = searchRaw?.length ? searchRaw : undefined;

  const hasImageRaw = first(raw.hasImage);
  const hasImage = hasImageRaw === "true" ? true : hasImageRaw === "false" ? false : undefined;

  const stockRaw = first(raw.stock);
  const stock = (PRODUCT_LIST_STOCK as readonly string[]).includes(stockRaw ?? "")
    ? (stockRaw as ProductListStock)
    : undefined;

  const sortRaw = first(raw.sort);
  const sort = (PRODUCT_LIST_SORTS as readonly string[]).includes(sortRaw ?? "")
    ? (sortRaw as ProductListSort)
    : "newest";

  const categoryRaw = Number(first(raw.category));
  const categoryId = Number.isInteger(categoryRaw) && categoryRaw > 0 ? categoryRaw : undefined;

  const pageRaw = Number(first(raw.page));
  const page = Number.isInteger(pageRaw) && pageRaw > 1 ? pageRaw : 1;

  return { search, hasImage, stock, sort, categoryId, page };
}

/** Serialises params back to a query string, omitting defaults. */
export function productListQuery(params: Partial<ProductListParams>) {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.hasImage !== undefined) q.set("hasImage", String(params.hasImage));
  if (params.stock) q.set("stock", params.stock);
  if (params.sort && params.sort !== "newest") q.set("sort", params.sort);
  if (params.categoryId) q.set("category", String(params.categoryId));
  if (params.page && params.page > 1) q.set("page", String(params.page));
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function hasActiveProductFilters(params: ProductListParams) {
  return Boolean(params.search) || params.hasImage !== undefined || Boolean(params.stock) || Boolean(params.categoryId);
}

/**
 * Low stock = tracked (>= 0) and at or below the product's threshold, which
 * defaults to 5 when unset. Keep in step with the SQL predicate in the
 * inventory router.
 */
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export type StockStatus = "untracked" | "out" | "low" | "ok";

export function stockStatus(stockQuantity: number, lowStockThreshold: number | null | undefined): StockStatus {
  if (stockQuantity < 0) return "untracked";
  if (stockQuantity === 0) return "out";
  if (stockQuantity <= (lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD)) return "low";
  return "ok";
}

/**
 * "Stock: low to high" ordering: tracked quantities ascending, untracked (-1)
 * last (it means "unknown", not "less than zero"). Ties break on name. Mirrors
 * the SQL ORDER BY in listProducts.
 */
export function compareStockAsc(
  a: { stockQuantity: number; name: string },
  b: { stockQuantity: number; name: string },
) {
  const au = a.stockQuantity < 0;
  const bu = b.stockQuantity < 0;
  if (au !== bu) return au ? 1 : -1;
  if (a.stockQuantity !== b.stockQuantity) return a.stockQuantity - b.stockQuantity;
  return a.name.localeCompare(b.name);
}
