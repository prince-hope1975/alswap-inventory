# Edit Product Page
**Path**: `src/app/inventory/products/[id]/page.tsx`

## Purpose
Interface for editing an existing product.

## Features
*   **Dynamic Route**: `[id]` parameter.
*   **Data Fetching**: Fetches product details via `api.inventory.getProduct` and categories via `api.inventory.listCategories`.
*   **Form**: Delegates to `ProductForm` component, passing initial data.
*   **404 Handling**: returns `notFound()` if product is invalid.

## Dependencies
*   `~/trpc/server`: `api`
*   `./product-form`: Reusable form for create/edit.
