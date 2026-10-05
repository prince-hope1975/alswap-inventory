/**
 * Maps a stored product to the edit form's initial values. Every field the
 * form submits must be carried here: the form sends the whole object back on
 * save, so a field left out (salePrice used to be) is wiped on every edit.
 */

export type ProductFormSource = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  categoryId: number | null;
  description: string | null;
  image: string | null;
  images: string[] | null;
  costPrice: string | null;
  price: string;
  salePrice: string | null;
  stockQuantity: number;
  lowStockThreshold: number | null;
  productCategories?: { category: { id: number; name: string } }[];
};

export function toProductFormInitialData(product: ProductFormSource) {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku ?? undefined,
    barcode: product.barcode ?? undefined,
    categoryId: product.categoryId ?? undefined,
    description: product.description ?? undefined,
    image: product.image ?? undefined,
    images: product.images ?? undefined,
    costPrice: product.costPrice ?? undefined,
    price: product.price,
    salePrice: product.salePrice,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold ?? 5,
    productCategories: product.productCategories,
  };
}

/** Decimal string from the DB -> form number (or null for "no sale"). */
export function parseOptionalPrice(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Form input -> number | null. An emptied number input must mean "no value", not NaN. */
export function optionalNumberInput(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Non-blocking hint shown under the threshold field. Saving is allowed either
 * way; a product sitting at or under its threshold simply shows as low stock.
 */
export function lowStockThresholdWarning(stockQuantity: number, lowStockThreshold: number) {
  if (!Number.isFinite(stockQuantity) || !Number.isFinite(lowStockThreshold)) return null;
  if (stockQuantity < 0) return null;
  if (stockQuantity <= lowStockThreshold) {
    return `Stock (${stockQuantity}) is at or below this threshold, so the product will show as low stock.`;
  }
  return null;
}
