import "server-only";

import { api } from "~/trpc/server";

/**
 * Brand-neutral fallback. This codebase is a multi-tenant template, so no
 * deployed brand may be hardcoded — an unresolved tenant must degrade to a
 * generic word, never to another tenant's name.
 */
export const DEFAULT_STORE_NAME = "Store";

export type TenantBranding = {
  name: string;
  initial: string;
  logo: string | null;
  currency: string;
  brandColor: string;
};

/**
 * Host-resolved branding for server components.
 *
 * Deliberately uses the public `shop.getShopDetails` procedure rather than
 * `settings.getTenantSettings`, which is an ADMIN-only `tenantProcedure`
 * (`src/server/api/trpc.ts:171`) — it throws for CASHIER and MANAGER sessions,
 * so every back-office surface they touch fell back to the hardcoded default.
 */
export async function getTenantBranding(): Promise<TenantBranding> {
  try {
    const { tenant } = await api.shop.getShopDetails();
    const name = tenant?.name ?? DEFAULT_STORE_NAME;
    return {
      name,
      initial: name[0]?.toUpperCase() ?? "S",
      logo: tenant?.logo ?? null,
      currency: tenant?.currency ?? "₦",
      brandColor: tenant?.brandColor ?? "#000000",
    };
  } catch {
    return {
      name: DEFAULT_STORE_NAME,
      initial: "S",
      logo: null,
      currency: "₦",
      brandColor: "#000000",
    };
  }
}
