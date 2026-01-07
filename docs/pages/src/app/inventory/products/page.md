# Products List Page
**Path**: `src/app/inventory/products/page.tsx`

## Purpose
Main inventory catalog view.

## Features
*   **Search**: Server-side search by name/SKU.
*   **Listing**: Display products with image, SKU, category, price, and stock status.
*   **Actions**:
    *   Edit (Link to `[id]`).
    *   Delete (Mutation with confirmation).
*   **Pagination**: Supported via `api.inventory.listProducts`.

## Dependencies
*   `~/trpc/react`: `api`
*   `~/hooks/use-tenant-settings`: Currency formatting.
