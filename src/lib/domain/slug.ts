/**
 * Canonical path for a product detail page.
 *
 * Falls back to the id while legacy rows still have a null slug — the product
 * route resolves either form, so both are valid links.
 */
export function productPath(product: { id: string; slug?: string | null }) {
  return `/products/${product.slug ?? product.id}`;
}

export function createSlug(value: string) {
  return value
    .replace(/[\u00b2\u00b3\u00b9\u2070-\u2079]/g, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}
