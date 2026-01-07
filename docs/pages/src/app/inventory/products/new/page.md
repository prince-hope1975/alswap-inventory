# New Product Page
**Path**: `src/app/inventory/products/new/page.tsx`

## Purpose
Creation of new products via form or bulk import.

## Features
*   **Modes**:
    *   **Single Product**: Traditional form (`ProductForm`).
    *   **Bulk Import**: Excel/CSV upload (`BulkImport` component).
*   **Tabs**: Uses `Tabs` (Radix UI) to switch modes.
*   **Data Fetching**: Fetches categories for the dropdowns.

## Dependencies
*   `~/trpc/server`: `api`
*   `./product-form`: Form component.
*   `./bulk-import`: CSV/Excel import handler.
