/**
 * The only product columns the public storefront may load. Anything a
 * shopper's browser or a public page receives goes through these, so cost
 * price, wholesale price, supplier, barcode, serial number, seller and other
 * internal fields never leave the server.
 *
 * Keep this an allowlist: a new column on `products` stays private until
 * someone adds it here on purpose.
 */

/** Grid cards, quick-look modal, cart and `shop.getProduct*`. */
export const publicProductColumns = {
  id: true,
  name: true,
  slug: true,
  description: true,
  image: true,
  images: true,
  price: true,
  salePrice: true,
  stockQuantity: true,
  lowStockThreshold: true,
  condition: true,
  // Shown on the public product page and in its JSON-LD already.
  sku: true,
  brand: true,
  gtin: true,
  mpn: true,
  warrantyMonths: true,
  specifications: true,
  categoryId: true,
} as const;

/** The server-rendered product page also shows the seller's condition notes. */
export const productPageColumns = {
  ...publicProductColumns,
  conditionNotes: true,
} as const;

const publicCategoryColumns = { id: true, name: true, slug: true } as const;

/** Category relations to load alongside a public product. */
export const publicProductRelations = {
  category: { columns: publicCategoryColumns },
  productCategories: {
    columns: { categoryId: true },
    with: { category: { columns: publicCategoryColumns } },
  },
} as const;
