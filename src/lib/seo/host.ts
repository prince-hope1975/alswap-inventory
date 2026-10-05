/**
 * Canonical form of a `Host` / `X-Forwarded-Host` header value: first hop only,
 * lower-cased, without port or leading `www.`.
 *
 * Lives here rather than in `tenant-resolution.ts` because tenant resolution
 * now depends on surface parsing (below), and the reverse dependency would be
 * a cycle. `tenant-resolution.ts` re-exports it for existing callers.
 */
export function normalizeRequestHost(rawHost: string | null | undefined) {
  return (rawHost ?? "")
    .split(",")[0]!
    .trim()
    .toLocaleLowerCase()
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

/**
 * Host labels that identify a *surface* of the business rather than a distinct
 * site. Stripping one of these yields the registrable root domain that all
 * surfaces share.
 *
 * Kept free of `server-only` and of `next/headers` so it can be used from
 * middleware (edge runtime) as well as from server components.
 */
export const SURFACE_LABELS = ["shop", "solar", "used", "app", "blog"] as const;
export type SurfaceLabel = (typeof SURFACE_LABELS)[number];

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

export function isLocalHost(host: string) {
  return LOCAL_HOSTS.has(host) || host.endsWith(".localhost");
}

function protocolFor(host: string) {
  return isLocalHost(host) ? "http" : "https";
}

/**
 * `shop.alswap.com.ng` -> `alswap.com.ng`. Hosts that do not start with a known
 * surface label are already the root and are returned unchanged.
 */
export function registrableRootFromHost(rawHost: string | null | undefined) {
  const host = normalizeRequestHost(rawHost);
  if (!host) return "";
  const [first, ...rest] = host.split(".");
  if (rest.length === 0) return host;
  return SURFACE_LABELS.includes(first as SurfaceLabel) ? rest.join(".") : host;
}

export function surfaceLabelFromHost(
  rawHost: string | null | undefined,
): SurfaceLabel | null {
  const host = normalizeRequestHost(rawHost);
  const first = host.split(".")[0];
  return SURFACE_LABELS.includes(first as SurfaceLabel)
    ? (first as SurfaceLabel)
    : null;
}

/**
 * Where a surface sends its bare root path. `null` means "leave the route tree
 * alone" — every surface serves the same routes, only `/` differs.
 */
const SURFACE_ROOT_ROUTE: Record<SurfaceLabel, { pathname: string; params?: Record<string, string> }> = {
  shop: { pathname: "/shop" },
  solar: { pathname: "/solar" },
  used: { pathname: "/shop", params: { condition: "USED,REFURBISHED" } },
  app: { pathname: "/inventory" },
  blog: { pathname: "/blog" },
};

export interface SurfaceRoute {
  surface: SurfaceLabel | null;
  /** Pathname the request should be treated as, for auth *and* for rewriting. */
  pathname: string;
  /** Query string to rewrite to, without the leading "?". Empty when unchanged. */
  search: string;
  /** True when the resolved route differs from what was requested. */
  rewritten: boolean;
}

/**
 * Resolve which surface a host represents and what route its request maps to.
 *
 * Only `/` is remapped. Every other path is served identically on every
 * surface, so `used.<root>/products/abc` must not be rewritten into
 * `/shop/products/abc`.
 *
 * Pure and edge-safe by design: the middleware must run its auth and role
 * checks against the *returned* pathname, so that decision has to be
 * computable without touching the request object.
 */
export function resolveSurfaceRoute(
  rawHost: string | null | undefined,
  pathname: string,
  search = "",
): SurfaceRoute {
  const surface = surfaceLabelFromHost(rawHost);
  if (!surface || pathname !== "/") {
    return { surface, pathname, search: "", rewritten: false };
  }

  const target = SURFACE_ROOT_ROUTE[surface];
  // Merge rather than replace: `used.<root>/?search=generator` has to keep its
  // search term while still gaining the condition filter.
  const params = new URLSearchParams(search);
  for (const [key, value] of Object.entries(target.params ?? {})) {
    if (!params.has(key)) params.set(key, value);
  }
  return {
    surface,
    pathname: target.pathname,
    search: params.toString(),
    rewritten: true,
  };
}

/**
 * Port from a raw Host header value, preserved only for local development.
 */
export function portFromRawHost(rawHost: string | null | undefined) {
  return rawHost?.split(",")[0]?.trim().match(/:(\d+)$/)?.[1] ?? null;
}

/**
 * Absolute origin for a host, preserving the port in local development.
 *
 * `www.` is kept rather than normalized away: this builds self-referential
 * URLs (robots.txt, sitemap.xml, password-reset links), and the apex
 * 308-redirects to `www`, so stripping it emits a redirecting URL for every
 * entry — which Search Console excludes as "Page with redirect".
 * `normalizeRequestHost` still drops it for tenant lookup, where apex and
 * `www` must resolve to the same tenant.
 */
export function baseUrlFromHost(
  rawHost: string | null | undefined,
  port?: string | null,
) {
  const normalized = normalizeRequestHost(rawHost);
  const hadWww = /^www\./i.test(
    (rawHost ?? "").split(",")[0]!.trim().toLocaleLowerCase(),
  );
  const host = hadWww && normalized ? `www.${normalized}` : normalized;
  if (!host) return "http://localhost:3000";
  const suffix = port && isLocalHost(host) ? `:${port}` : "";
  return `${protocolFor(host)}://${host}${suffix}`;
}

/**
 * Origin of the single commerce host for a request host.
 *
 * With `commerceSubdomain` unset the commerce host is the root domain itself,
 * which is the correct behaviour before subdomain surfaces exist.
 */
export function commerceBaseUrlFromHost(
  rawHost: string | null | undefined,
  commerceSubdomain?: string | null,
  port?: string | null,
) {
  const root = registrableRootFromHost(rawHost);
  if (!root) return "http://localhost:3000";
  const label = commerceSubdomain?.trim();
  return baseUrlFromHost(label ? `${label}.${root}` : root, port);
}

/**
 * Origin of the brand's home host (`www.<root>`), regardless of which surface
 * served the request.
 *
 * For pages that describe the business rather than sell from the catalogue
 * (About). They canonicalize here so brand signals gather on the same host as
 * the homepage Google reads the site name from, not on the commerce host.
 */
export function homeBaseUrlFromHost(
  rawHost: string | null | undefined,
  port?: string | null,
) {
  const root = registrableRootFromHost(rawHost);
  if (!root) return "http://localhost:3000";
  return baseUrlFromHost(isLocalHost(root) ? root : `www.${root}`, port);
}
