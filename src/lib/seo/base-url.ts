import "server-only";

import { headers } from "next/headers";

import { env } from "~/env";
import {
  baseUrlFromHost,
  commerceBaseUrlFromHost,
  portFromRawHost,
} from "~/lib/seo/host";

export {
  SURFACE_LABELS,
  registrableRootFromHost,
  surfaceLabelFromHost,
  type SurfaceLabel,
} from "~/lib/seo/host";

export async function requestHost() {
  const headerList = await headers();
  return headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
}

/**
 * Self-referential origin for the host that served this request.
 *
 * Use for `robots.txt` and `sitemap.xml` only — each surface must describe
 * itself. Do NOT use for canonicals; see {@link canonicalCommerceBaseUrl}.
 */
export async function requestBaseUrl() {
  const raw = await requestHost();
  return baseUrlFromHost(raw, portFromRawHost(raw));
}

/**
 * Origin of the single commerce host, regardless of which surface served the
 * request.
 *
 * Product and article canonicals, JSON-LD `url`/`offers.url`, and Merchant
 * Center feed `link` values must all resolve here. If they were
 * request-derived, the same product served on the apex, `shop.` and `used.`
 * would self-canonicalize on each — splitting the ranking signals, and
 * breaking the Merchant Center domain claim, which covers one domain only.
 */
export async function canonicalCommerceBaseUrl() {
  const raw = await requestHost();
  return commerceBaseUrlFromHost(
    raw,
    env.COMMERCE_SUBDOMAIN,
    portFromRawHost(raw),
  );
}

/**
 * Absolute canonical URL for a path on the commerce host.
 */
export async function canonicalUrl(path: string) {
  const base = await canonicalCommerceBaseUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
