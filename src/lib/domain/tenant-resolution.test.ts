import { describe, expect, it } from "vitest";

import {
  normalizeConfiguredDomain,
  normalizeRequestHost,
  selectTenantForHost,
} from "./tenant-resolution";

describe("tenant host resolution", () => {
  it("normalizes forwarded hosts, ports, case and www", () => {
    expect(
      normalizeRequestHost("WWW.Shop.Example.com:443, proxy.internal"),
    ).toBe("shop.example.com");
  });

  it("matches a custom domain before development fallback", () => {
    expect(
      selectTenantForHost("shop.example.com", [
        { id: "fallback", slug: "fallback", customDomain: null },
        { id: "store", slug: "alswap", customDomain: "shop.example.com" },
      ]),
    ).toBe("store");
  });

  it("normalizes a configured storefront hostname", () => {
    expect(normalizeConfiguredDomain("  WWW.SPPD.Amachree.Dev  ")).toBe(
      "sppd.amachree.dev",
    );
    expect(normalizeConfiguredDomain("")).toBeNull();
  });

  it.each([
    "https://sppd.amachree.dev",
    "sppd.amachree.dev/shop",
    "sppd.amachree.dev:443",
    "localhost",
    "not a domain",
    "-bad.example.com",
  ])("rejects invalid configured domain %s", (domain) => {
    expect(normalizeConfiguredDomain(domain)).toBeNull();
  });
});
