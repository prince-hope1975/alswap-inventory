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

  it("resolves a surface subdomain to the tenant that owns the root domain", () => {
    const tenants = [
      { id: "other", slug: "other", customDomain: "example.org" },
      { id: "store", slug: "alswap-1784546871174", customDomain: "alswap.com.ng" },
    ];
    for (const host of [
      "alswap.com.ng",
      "shop.alswap.com.ng",
      "used.alswap.com.ng",
      "solar.alswap.com.ng",
      "app.alswap.com.ng",
    ]) {
      expect(selectTenantForHost(host, tenants)).toBe("store");
    }
  });

  it("does not resolve an unrelated domain that merely shares a surface label", () => {
    expect(
      selectTenantForHost("shop.someoneelse.com", [
        { id: "store", slug: "alswap", customDomain: "alswap.com.ng" },
      ]),
    ).toBeNull();
  });

  it("falls back to the first tenant on every *.localhost surface", () => {
    const tenants = [
      { id: "first", slug: "first", customDomain: null },
      { id: "second", slug: "second", customDomain: null },
    ];
    for (const host of ["localhost:3000", "shop.localhost:3000", "app.localhost"]) {
      expect(selectTenantForHost(host, tenants)).toBe("first");
    }
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
