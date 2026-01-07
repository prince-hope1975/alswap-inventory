# POS Terminal Page
**Path**: `src/app/pos/page.tsx`

## Purpose
The core Point-of-Sale interface for cashier operations. Designed for speed and offline resilience.

## Features
*   **Offline-First**: Uses `IndexedDB` (via Dexie.js) for product storage an order queueing.
*   **Sync**: `usePosSync` hook synchronizes local data with the server when online.
*   **Product Search**: Fuzzy search capability on client-side database.
*   **Cart**: Add/remove items, update quantities, handle discounts.
*   **Checkout**: Process payments via Cash, Transfer, or POS Terminal.
*   **Customer**: Select or create customers inline.

## Dependencies
*   `dexie`: Local database.
*   `~/hooks/use-pos-sync`: Data synchronization logic.
*   `~/trpc/react`: `api` (for initial sync/fallback).
