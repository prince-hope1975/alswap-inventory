// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SQL } from "drizzle-orm";

vi.mock("~/server/auth", () => ({ auth: vi.fn() }));
vi.mock("~/server/db", () => ({ db: {} }));
vi.mock("~/server/db/schema", async () => {
  const { pgTable, text } = await import("drizzle-orm/pg-core");
  return { tenants: pgTable("tenants", { id: text("id"), currency: text("currency") }) };
});
vi.mock("~/server/utils/encryption", () => ({ encryptString: vi.fn() }));

import { settingsRouter } from "./settings";

const findFirst = vi.fn<(query: { columns?: { currency: boolean }; where: SQL }) => Promise<{ currency: string } | undefined>>();
function caller(role: "ADMIN" | "MANAGER" | "CASHIER" | "USER", tenantId: string | null = "tenant-a") {
  return settingsRouter.createCaller({
    db: { query: { tenants: { findFirst } } },
    session: { user: { id: "staff-a", role, tenantId }, expires: "2099-01-01" },
    headers: new Headers(),
  } as unknown as Parameters<typeof settingsRouter.createCaller>[0]);
}

describe("staff currency access", () => {
  beforeEach(() => {
    findFirst.mockReset();
    findFirst.mockResolvedValue({ currency: "$" });
  });

  it.each(["ADMIN", "MANAGER", "CASHIER"] as const)("lets %s read only their tenant currency", async (role) => {
    expect(await caller(role).getStaffCurrency()).toEqual({ currency: "$" });
    const query = findFirst.mock.calls[0]![0];
    expect(query.columns).toEqual({ currency: true });
    expect(query.where.queryChunks).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: "tenant-a" }),
    ]));
  });

  it("rejects non-staff and staff without a tenant before querying", async () => {
    await expect(caller("USER").getStaffCurrency()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller("MANAGER", null).getStaffCurrency()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("keeps full settings admin-only", async () => {
    await expect(caller("MANAGER").getTenantSettings()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("reports a missing tenant", async () => {
    findFirst.mockResolvedValue(undefined);
    await expect(caller("MANAGER").getStaffCurrency()).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
