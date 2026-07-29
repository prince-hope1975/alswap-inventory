import { normalizeRequestHost } from "~/lib/domain/tenant-resolution";

/**
 * Host labels that identify a *surface* of the business rather than a distinct
 * site. Stripping one of these yields the registrable root domain that all
 * surfaces share.
 *
 * Kept free of `server-only` and of `next/headers` so it can be used from
 * middleware (edge runtime) as well as from server components.
 */
export const SURFACE_LABELS = ["shop", "solar", "used", "app"] as const;
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
 * Port from a raw Host header value, preserved only for local development.
 */
export function portFromRawHost(rawHost: string | null | undefined) {
  return rawHost?.split(",")[0]?.trim().match(/:(\d+)$/)?.[1] ?? null;
}

/**
 * Absolute origin for a host, preserving the port in local development.
 */
export function baseUrlFromHost(
  rawHost: string | null | undefined,
  port?: string | null,
) {
  const host = normalizeRequestHost(rawHost);
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
