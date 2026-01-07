# Store Settings Page
**Path**: `src/app/inventory/settings/store/page.tsx`

## Purpose
Configuration for the public-facing storefront.

## Features
*   **Metadata**: Store name, description (SEO).
*   **Hero Section**: Title, description, background image.
*   **Appearance**:
    *   **Theme Mode**: Light/Dark toggle.
    *   **Template**: Selector for storefront layout (Modern/Classic/etc).
*   **Logistics**: Delivery prices, Pickup location (`LocationPicker`).
*   **Payments**: Paystack public key configuration.

## Dependencies
*   `~/trpc/react`: `api`
*   `open-location-picker`: Map interface.
