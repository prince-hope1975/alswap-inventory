# Solar Planning Page

**Path**: `src/app/solar/page.tsx`

**Route**: `/solar`, plus the rewritten root of the `solar.` surface

## Purpose

Public load-planning and installation-survey landing page for homes, shops, and offices.

## Features

- Presents the solar sizing workflow, assumptions, FAQs, and survey request path.
- Emits Service and FAQ structured data.
- Uses the solar-planning social card on SPPD and project-preview hosts.
- Canonicalizes the solar surface to its root and off-surface access to `/solar`.

## Key Components Used

- `SolarEstimator`: Interactive appliance load and system-sizing workflow.
- `PublicStoreUnavailable`: Safe unresolved-tenant state.

## Data Sources

- `api.shop.getShopDetails`: Tenant branding, location, and contact data.

## Dependencies

- `~/lib/seo/social-metadata`: Host-scoped Open Graph and Twitter metadata.
- `~/lib/seo/builders`: Service structured-data builder.
