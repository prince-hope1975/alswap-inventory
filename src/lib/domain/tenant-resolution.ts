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

export function normalizeRequestHost(rawHost: string | null | undefined) {
  return (rawHost ?? "")
    .split(",")[0]!
    .trim()
    .toLocaleLowerCase()
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

export function selectTenantForHost(
  host: string,
  tenants: TenantHostCandidate[],
) {
  const normalized = normalizeRequestHost(host);
  const customDomain = tenants.find(
    (tenant) =>
      normalizeRequestHost(tenant.customDomain) === normalized &&
      !!tenant.customDomain,
  );
  if (customDomain) return customDomain.id;

  const subdomain = normalized.split(".")[0];
  const slugMatch = tenants.find(
    (tenant) => tenant.slug.toLocaleLowerCase() === subdomain,
  );
  if (slugMatch) return slugMatch.id;

  if (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized.endsWith(".vercel.app")
  ) {
    return tenants[0]?.id ?? null;
  }
  return null;
}
