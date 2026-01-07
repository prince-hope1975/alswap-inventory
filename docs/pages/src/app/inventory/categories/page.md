# Categories Page
**Path**: `src/app/inventory/categories/page.tsx`

## Purpose
Manages product categories.

## Features
*   **Server Component**: Fetches initial categories on the server via `api.inventory.listCategories`.
*   **Client Component**: Delegates rendering to `CategoryList` (`./category-list`) for interactivity (create, update, delete).
*   **Hydration**: Uses `HydrateClient` to pass server data to client cache.

## Dependencies
*   `~/trpc/server`: `api`
*   `./category-list`: Client component for category management.
