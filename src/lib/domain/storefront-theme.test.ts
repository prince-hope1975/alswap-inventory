import { describe, expect, it } from "vitest";

import { ELECTRICAL_STOREFRONT_COLORS, resolveStorefrontTheme } from "./storefront-theme";

describe("storefront theme", () => {
  it("defaults system storefronts to light and always preserves an explicit customer choice", () => {
    expect(resolveStorefrontTheme("system", null)).toBe("light");
    expect(resolveStorefrontTheme("system", "dark")).toBe("dark");
    expect(resolveStorefrontTheme("light", "dark")).toBe("dark");
    expect(resolveStorefrontTheme("dark", "light")).toBe("light");
  });

  it("uses an electrical retail palette without purple", () => {
    expect(Object.values(ELECTRICAL_STOREFRONT_COLORS)).toEqual(
      expect.arrayContaining(["#112b3c", "#0b6e99", "#f5a623"]),
    );
    expect(Object.values(ELECTRICAL_STOREFRONT_COLORS).join(" ")).not.toMatch(/9333ea|a855f7|purple/i);
  });
});
