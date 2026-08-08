export type ProductReadinessInput = {
  name: string;
  description?: string | null;
  image?: string | null;
  images?: string[] | null;
  categoryName?: string | null;
  brand?: string | null;
  sku?: string | null;
  gtin?: string | null;
  mpn?: string | null;
  price: string | number;
  stockQuantity: number;
};

export function productSearchReadiness(product: ProductReadinessInput) {
  const checks = [
    { label: "name", complete: product.name.trim().length > 2 },
    {
      label: "image",
      complete: [product.image, ...(product.images ?? [])].some(Boolean),
    },
    {
      label: "useful description",
      complete: (product.description?.trim().length ?? 0) >= 40,
    },
    { label: "category", complete: Boolean(product.categoryName?.trim()) },
    {
      label: "brand or product identifier",
      complete: [product.brand, product.sku, product.gtin, product.mpn].some(
        (value) => Boolean(value?.trim()),
      ),
    },
    {
      label: "valid price",
      complete:
        Number.isFinite(Number(product.price)) && Number(product.price) >= 0,
    },
    {
      label: "availability",
      complete: Number.isInteger(product.stockQuantity),
    },
  ];
  const missing = checks
    .filter((check) => !check.complete)
    .map((check) => check.label);
  return {
    ready: missing.length === 0,
    completed: checks.length - missing.length,
    total: checks.length,
    missing,
  };
}
