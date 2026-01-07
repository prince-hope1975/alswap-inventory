# Receipt Page
**Path**: `src/app/pos/receipt/[orderId]/page.tsx`

## Purpose
Printable view of an order receipt.

## Features
*   **Dynamic Route**: `[orderId]` parameter.
*   **Data Fetching**: Fetches specific order details using `api.pos.getOrder`.
*   **Rendering**: Uses `Receipt` component designed for thermal printer layouts.

## Dependencies
*   `~/trpc/react`: `api`
*   `./receipt`: Printable component.
