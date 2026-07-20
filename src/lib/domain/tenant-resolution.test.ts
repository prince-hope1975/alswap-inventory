import { describe, expect, it } from "vitest";

import { normalizeRequestHost, selectTenantForHost } from "./tenant-resolution";

describe("tenant host resolution", () => {
  it("normalizes forwarded hosts, ports, case and www", () => {
    expect(normalizeRequestHost("WWW.Shop.Example.com:443, proxy.internal")).toBe("shop.example.com");
  });

  it("matches a custom domain before development fallback", () => {
    expect(
      selectTenantForHost("shop.example.com", [
        { id: "fallback", slug: "fallback", customDomain: null },
        { id: "store", slug: "alswap", customDomain: "shop.example.com" },
      ]),
    ).toBe("store");
  });
});
