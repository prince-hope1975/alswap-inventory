import { describe, expect, it } from "vitest";

import { can } from "./access";

describe("role permissions", () => {
  it("allows managers but not cashiers to approve document imports", () => {
    expect(can("MANAGER", "documents:approve")).toBe(true);
    expect(can("CASHIER", "documents:approve")).toBe(false);
  });

  it("allows cashiers to sell but prevents settings access", () => {
    expect(can("CASHIER", "sales:create")).toBe(true);
    expect(can("CASHIER", "settings:manage")).toBe(false);
  });
});
