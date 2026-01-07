# Customers Page
**Path**: `src/app/inventory/customers/page.tsx`

## Purpose
Lists all customers and allows management (view history, edit details).

## Features
*   **Server Component**: Fetches customer list.
*   **Management**: Delegates to `CustomerList` (`./customer-list`).
*   **Link**: Navigation to customer history (`/inventory/customers/[id]`).

## Dependencies
*   `~/trpc/server`: `api`
*   `./customer-list`: Client component.
