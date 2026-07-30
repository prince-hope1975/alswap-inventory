import {
  isLocalHost,
  normalizeRequestHost,
  registrableRootFromHost,
} from "~/lib/seo/host";

export { normalizeRequestHost };

export interface TenantHostCandidate {
  id: string;
  slug: string;
  customDomain: string | null;
}

const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function normalizeConfiguredDomain(
  rawDomain: string | null | undefined,
) {
  const normalized = (rawDomain ?? "")
    .trim()
    .toLocaleLowerCase()
    .replace(/^www\./, "");
  if (!normalized) return null;
  if (
    normalized.length > 253 ||
    normalized.includes(":") ||
    normalized.includes("/")
  ) {
    return null;
  }

  const labels = normalized.split(".");
  if (labels.length < 2 || labels.some((label) => !DOMAIN_LABEL.test(label)))
    return null;
  return normalized;
}

/**
 * Resolve the tenant serving a host.
 *
 * Subdomains here identify a *surface* of one tenant (`shop.`, `used.`,
 * `solar.`, `app.`), not separate tenants, so matching happens on the
 * registrable root domain and the surface label is discarded.
 *
 * The old first-label-vs-`tenant.slug` match is gone deliberately: signup mints
 * slugs as `${name}-${Date.now()}` (`auth.ts:33-41`), so `shop.alswap.com.ng`
 * could never match `alswap-1784546871174`. It matched nothing in practice and
 * would now shadow the root-domain match.
 */
export function selectTenantForHost(
  host: string,
  tenants: TenantHostCandidate[],
) {
  const normalized = normalizeRequestHost(host);
  const exact = tenants.find(
    (tenant) =>
      !!tenant.customDomain &&
      normalizeRequestHost(tenant.customDomain) === normalized,
  );
  if (exact) return exact.id;

  // `shop.alswap.com.ng` -> `alswap.com.ng`, which is what `customDomain` holds.
  const root = registrableRootFromHost(normalized);
  const rootMatch = tenants.find(
    (tenant) =>
      !!tenant.customDomain &&
      normalizeRequestHost(tenant.customDomain) === root,
  );
  if (rootMatch) return rootMatch.id;

  // Development fallback. `isLocalHost` covers `*.localhost`, which is how the
  // surfaces are exercised locally (`shop.localhost:3000` resolves to 127.0.0.1
  // in Chrome and Firefox with no hosts-file edit).
  if (isLocalHost(root) || root.endsWith(".vercel.app")) {
    return tenants[0]?.id ?? null;
  }
  return null;
}
