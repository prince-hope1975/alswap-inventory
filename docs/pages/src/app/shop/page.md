# Public Shop Page

**Path**: `src/app/shop/page.tsx`

**Route**: `/shop`, plus the rewritten roots of `shop.` and `used.` surfaces

## Purpose

Public searchable product catalog for ordinary and used/refurbished inventory.

## Features

- Fetches tenant details, categories, and the first product page on the server.
- Accepts search, category, and validated product-condition filters.
- Uses the ordinary shop social card on `shop.` and the tested-equipment card on `used.`.
- Canonicalizes a dedicated shop/used surface to its root and an off-surface shop page to `/shop`.

## Key Components Used

- `StoreLayout`: Storefront shell, filters, catalog, and cart entry points.
- `CartProvider`: Public shopping-cart state.
- `PublicStoreUnavailable`: Safe unresolved-tenant state.

## Data Sources

- `api.shop.getShopDetails`
- `api.shop.getCategories`
- `api.shop.getProducts`

## Dependencies

- `~/lib/seo/social-metadata`: Surface-specific Open Graph and Twitter metadata.
