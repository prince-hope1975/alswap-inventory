# Find Us Page
**Path**: `src/app/find-us/page.tsx`

## Purpose
Displays the physical location of the shop and provides navigation options.

## Features
*   **Map Integration**: Uses `LocationPicker` (read-only mode) to show coordinates.
*   **Directions**: Links to Google Maps and Apple Maps.
*   **Reverse Geocoding**: Fetches address from Nominatim (OpenStreetMap) if coordinates exist but address is missing.
*   **Tenant Info**: Fetches location data via `api.shop.getShopDetails`.

## Dependencies
*   `~/trpc/react`: `api`
*   `@tanstack/react-query`: `useQuery`
*   `~/lib/maps`: Map utilities.
*   `~/app/_components/maps/location-picker`: `LocationPicker`
