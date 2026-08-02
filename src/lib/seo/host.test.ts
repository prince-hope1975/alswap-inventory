import { describe, expect, it } from "vitest";

import {
  baseUrlFromHost,
  commerceBaseUrlFromHost,
  portFromRawHost,
  registrableRootFromHost,
  resolveSurfaceRoute,
  surfaceLabelFromHost,
} from "./host";

describe("registrableRootFromHost", () => {
  it("strips a known surface label", () => {
    expect(registrableRootFromHost("shop.alswap.com.ng")).toBe("alswap.com.ng");
    expect(registrableRootFromHost("used.alswap.com.ng")).toBe("alswap.com.ng");
    expect(registrableRootFromHost("app.alswap.com.ng")).toBe("alswap.com.ng");
  });

  it("leaves an apex host unchanged", () => {
    expect(registrableRootFromHost("alswap.com.ng")).toBe("alswap.com.ng");
  });

  it("does not strip labels that merely look like subdomains", () => {
    expect(registrableRootFromHost("sppd.amachree.dev")).toBe("sppd.amachree.dev");
  });

  it("normalizes port, case and www before stripping the surface label", () => {
    expect(registrableRootFromHost("WWW.Shop.Alswap.com.ng:443")).toBe(
      "alswap.com.ng",
    );
  });
});

describe("surfaceLabelFromHost", () => {
  it("identifies known surfaces", () => {
    expect(surfaceLabelFromHost("solar.alswap.com.ng")).toBe("solar");
    expect(surfaceLabelFromHost("shop.localhost")).toBe("shop");
  });

  it("returns null for the apex and unknown labels", () => {
    expect(surfaceLabelFromHost("alswap.com.ng")).toBeNull();
    expect(surfaceLabelFromHost("mail.alswap.com.ng")).toBeNull();
  });
});

describe("resolveSurfaceRoute", () => {
  it("maps each surface root to its landing route", () => {
    expect(resolveSurfaceRoute("shop.alswap.com.ng", "/").pathname).toBe("/shop");
    expect(resolveSurfaceRoute("solar.alswap.com.ng", "/").pathname).toBe("/solar");
    expect(resolveSurfaceRoute("app.alswap.com.ng", "/").pathname).toBe("/inventory");
  });

  it("pre-filters the used surface to non-new stock", () => {
    const route = resolveSurfaceRoute("used.alswap.com.ng", "/");
    expect(route.pathname).toBe("/shop");
    expect(new URLSearchParams(route.search).get("condition")).toBe(
      "USED,REFURBISHED",
    );
  });

  it("merges surface params with the incoming query instead of replacing it", () => {
    const route = resolveSurfaceRoute("used.alswap.com.ng", "/", "search=generator");
    const params = new URLSearchParams(route.search);
    expect(params.get("search")).toBe("generator");
    expect(params.get("condition")).toBe("USED,REFURBISHED");
  });

  it("lets an explicit condition win over the surface default", () => {
    const route = resolveSurfaceRoute("used.alswap.com.ng", "/", "condition=NEW");
    expect(new URLSearchParams(route.search).get("condition")).toBe("NEW");
  });

  it("never rewrites a path other than the root", () => {
    const route = resolveSurfaceRoute("used.alswap.com.ng", "/products/abc");
    expect(route).toMatchObject({
      surface: "used",
      pathname: "/products/abc",
      rewritten: false,
    });
  });

  it("leaves the apex untouched", () => {
    expect(resolveSurfaceRoute("alswap.com.ng", "/")).toMatchObject({
      surface: null,
      pathname: "/",
      rewritten: false,
    });
  });

  it("resolves surfaces in local development", () => {
    expect(resolveSurfaceRoute("app.localhost:3000", "/")).toMatchObject({
      surface: "app",
      pathname: "/inventory",
      rewritten: true,
    });
  });
});

describe("baseUrlFromHost", () => {
  it("uses https for public hosts and drops the port", () => {
    expect(baseUrlFromHost("shop.alswap.com.ng:443", "443")).toBe(
      "https://shop.alswap.com.ng",
    );
  });

  it("uses http and keeps the port locally", () => {
    expect(baseUrlFromHost("shop.localhost:3000", "3000")).toBe(
      "http://shop.localhost:3000",
    );
    expect(baseUrlFromHost("localhost:3000", "3000")).toBe(
      "http://localhost:3000",
    );
  });

  it("keeps www so self-referential URLs do not point at a redirect", () => {
    // The apex 308-redirects to www, so a sitemap served on www that lists
    // apex URLs lists nothing but redirects.
    expect(baseUrlFromHost("www.sppdamaks.com")).toBe(
      "https://www.sppdamaks.com",
    );
  });

  it("falls back when the host is missing", () => {
    expect(baseUrlFromHost(null)).toBe("http://localhost:3000");
  });
});

describe("commerceBaseUrlFromHost", () => {
  it("collapses every surface onto one commerce host", () => {
    for (const host of [
      "alswap.com.ng",
      "shop.alswap.com.ng",
      "used.alswap.com.ng",
      "solar.alswap.com.ng",
    ]) {
      expect(commerceBaseUrlFromHost(host, "shop")).toBe(
        "https://shop.alswap.com.ng",
      );
    }
  });

  // Every other fixture here is three-label (alswap.com.ng). The domain
  // actually being shipped is two-label, which is the shape that would break
  // if surface stripping ever counted labels instead of matching them.
  it("handles a two-label root domain", () => {
    expect(registrableRootFromHost("shop.sppdamaks.com")).toBe("sppdamaks.com");
    expect(surfaceLabelFromHost("used.sppdamaks.com")).toBe("used");
    expect(commerceBaseUrlFromHost("used.sppdamaks.com", "shop")).toBe(
      "https://shop.sppdamaks.com",
    );
    expect(commerceBaseUrlFromHost("sppdamaks.com", "shop")).toBe(
      "https://shop.sppdamaks.com",
    );
    // www is normalized away, so the canonical stays on the apex.
    expect(commerceBaseUrlFromHost("www.sppdamaks.com", "shop")).toBe(
      "https://shop.sppdamaks.com",
    );
  });

  it("uses the root domain when no commerce subdomain is configured", () => {
    expect(commerceBaseUrlFromHost("used.alswap.com.ng", undefined)).toBe(
      "https://alswap.com.ng",
    );
    expect(commerceBaseUrlFromHost("alswap.com.ng", null)).toBe(
      "https://alswap.com.ng",
    );
  });

  it("treats an empty subdomain as unset", () => {
    expect(commerceBaseUrlFromHost("alswap.com.ng", "  ")).toBe(
      "https://alswap.com.ng",
    );
  });
});

describe("portFromRawHost", () => {
  it("reads the port from the first forwarded hop", () => {
    expect(portFromRawHost("shop.localhost:3000, proxy.internal")).toBe("3000");
    expect(portFromRawHost("alswap.com.ng")).toBeNull();
  });
});
