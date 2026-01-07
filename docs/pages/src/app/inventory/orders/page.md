# Orders Page
**Path**: `src/app/inventory/orders/page.tsx`

## Purpose
Comprehensive order management interface.

## Features
*   **Infinite Scroll**: Lists orders with pagination.
*   **Filtering**: Filter by Status (Pending, Completed, Cancelled) and Delivery Method.
*   **Detail Drawer**: Clicking a row opens a drawer with full order details (items, customer, payment).
*   **Status Management**: Update order status directly from the drawer.
*   **Badges**: Visual status indicators.

## Dependencies
*   `~/trpc/react`: `api`
*   `~/hooks/use-tenant-settings`: `useCurrency`
*   `lucide-react`: Icons.
