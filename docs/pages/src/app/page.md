# Home Page

**Path**: `src/app/page.tsx`

**Route**: `/`

## Purpose

Public electrical-supplies landing page for the tenant resolved from the request host.

## Features

- Renders tenant Organization and WebSite/SearchAction structured data.
- Shows the electrical retail, sourcing, support, and solar entry points.
- Returns the unavailable-store state when the request host has no tenant.
- Emits a canonical URL and the SPPD main-site social card on approved SPPD and Vercel preview hosts.

## Key Components Used

- `ElectricalHome`: Public landing-page presentation.
- `PublicStoreUnavailable`: Safe unresolved-tenant state.

## Data Sources

- `api.shop.getShopDetails`: Public tenant identity, contact, and branding data.

## Dependencies

- `~/lib/seo/social-metadata`: Host-scoped Open Graph and Twitter metadata.
- `~/lib/seo/builders`: Organization and WebSite structured-data builders.
