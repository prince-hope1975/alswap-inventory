# Notifications Page
**Path**: `src/app/inventory/notifications/page.tsx`

## Purpose
Displays system notifications (e.g., low stock, new orders).

## Features
*   **Infinite Scroll**: Uses `useInfiniteQuery` (`api.notifications.list`).
*   **Mark as Read**: Individual or Bulk mark-as-read functionality.
*   **Filtering**: Toggle "Unread only".
*   **Empty State**: "No notifications yet" illustration.

## Dependencies
*   `~/trpc/react`: `api`
*   `lucide-react`: Icons.
