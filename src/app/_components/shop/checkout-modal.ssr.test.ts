// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

vi.mock("~/trpc/react", () => ({ api: {} }));
vi.mock("~/hooks/use-tenant-settings", () => ({ useCurrency: () => ({ formatCurrency: String }) }));

describe("CheckoutModal server boundary", () => {
  it("can be imported without evaluating browser-only Leaflet code", async () => {
    const module = await import("./checkout-modal");
    expect(module.CheckoutModal).toBeTypeOf("function");
  });
});
