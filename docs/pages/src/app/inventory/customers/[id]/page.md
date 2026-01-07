# Customer History Page
**Path**: `src/app/inventory/customers/[id]/page.tsx`

## Purpose
Detailed view of a specific customer's purchase history.

## Features
*   **Dynamic Route**: `[id]` parameter.
*   **Data Fetching**: Fetches customer details via `api.crm.getCustomer`.
*   **404 Handling**: returns `notFound()` if customer doesn't exist.
*   **History View**: Delegates to `CustomerHistory` component.

## Dependencies
*   `~/trpc/server`: `api`
*   `./customer-history`: Client component showing orders table.
