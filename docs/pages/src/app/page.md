# Home Page
**Path**: `src/app/page.tsx`

## Purpose
The main landing page/storefront for customers. It displays the shop's products, categories, and allows customers to add items to their cart.

## Features
*   **Server-Side Fetching**: Fetches shop details, categories, and products using tRPC (`api.shop.getShopDetails`, `api.inventory.listCategories`, `api.inventory.listProducts`).
*   **Components**:
    *   `StoreLayout`: Main wrapper for the storefront UI.
    *   `CartProvider`: Manages cart state.
*   **Functionality**:
    *   Displays tenant/shop name.
    *   Lists products (limit 20 initially).
    *   Responsive grid layout.

## Dependencies
*   `~/trpc/server`: `api`
*   `./_components/shop/cart-context`: `CartProvider`
*   `./_components/shop/store-layout`: `StoreLayout`
