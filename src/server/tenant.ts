import { desc } from "drizzle-orm";

import { normalizeRequestHost, selectTenantForHost } from "~/lib/domain/tenant-resolution";
import { tenants } from "~/server/db/schema";
import type { db as appDb } from "~/server/db";

type Database = typeof appDb;

export async function resolvePublicTenant(database: Database, headers: Headers) {
  const candidates = await database.query.tenants.findMany({
    columns: { id: true, slug: true, customDomain: true },
    orderBy: desc(tenants.updatedAt),
  });
  const host = normalizeRequestHost(headers.get("x-forwarded-host") ?? headers.get("host"));
  const tenantId = selectTenantForHost(host, candidates);
  if (!tenantId) return null;
  return database.query.tenants.findFirst({ where: (tenant, { eq }) => eq(tenant.id, tenantId) });
}
