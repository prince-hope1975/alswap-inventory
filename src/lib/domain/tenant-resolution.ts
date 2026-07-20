export interface TenantHostCandidate {
  id: string;
  slug: string;
  customDomain: string | null;
}

export function normalizeRequestHost(rawHost: string | null | undefined) {
  return (rawHost ?? "")
    .split(",")[0]!
    .trim()
    .toLocaleLowerCase()
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

export function selectTenantForHost(host: string, tenants: TenantHostCandidate[]) {
  const normalized = normalizeRequestHost(host);
  const customDomain = tenants.find(
    (tenant) => normalizeRequestHost(tenant.customDomain) === normalized && !!tenant.customDomain,
  );
  if (customDomain) return customDomain.id;

  const subdomain = normalized.split(".")[0];
  const slugMatch = tenants.find((tenant) => tenant.slug.toLocaleLowerCase() === subdomain);
  if (slugMatch) return slugMatch.id;

  if (normalized === "localhost" || normalized === "127.0.0.1" || normalized.endsWith(".vercel.app")) {
    return tenants[0]?.id ?? null;
  }
  return null;
}
