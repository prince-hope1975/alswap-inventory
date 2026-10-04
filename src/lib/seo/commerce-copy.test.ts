import { describe, expect, it } from "vitest";

import {
  categoryMetaDescription,
  categoryMetaTitle,
  productMetaDescription,
  productMetaTitle,
  shownPrice,
  truncate,
} from "./commerce-copy";

describe("shownPrice", () => {
  it("prefers a valid sale price", () => {
    expect(shownPrice("5000", "4500")).toBe(4500);
    expect(shownPrice("5000", null)).toBe(5000);
  });

  it("returns null when there is no price to show", () => {
    expect(shownPrice("0")).toBeNull();
    expect(shownPrice("abc")).toBeNull();
  });
});

describe("productMetaTitle", () => {
  it("matches the 'price in' search pattern only when a price is shown", () => {
    expect(productMetaTitle("200Ah Lithium Battery", 450000, "Warri")).toBe(
      "200Ah Lithium Battery Price in Warri",
    );
    expect(productMetaTitle("200Ah Lithium Battery", null, "Warri")).toBe("200Ah Lithium Battery");
  });
});

describe("productMetaDescription", () => {
  it("leads with the real price and stock state", () => {
    const text = productMetaDescription({
      name: "Standing Fan",
      price: 35000,
      currency: "₦",
      available: true,
      storeName: "SPPD AMAKS",
      location: "Warri",
      description: "18-inch oscillating fan.",
    });
    expect(text).toBe("Standing Fan: ₦35,000 at SPPD AMAKS, Warri. In stock. 18-inch oscillating fan.");
  });

  it("does not invent a price when none is set", () => {
    const text = productMetaDescription({
      name: "Carburetor",
      price: null,
      available: true,
      storeName: "SPPD AMAKS",
    });
    expect(text).not.toMatch(/₦/);
    expect(text).toContain("Ask for current price");
  });

  it("stays within the snippet length", () => {
    const text = productMetaDescription({
      name: "Fan",
      price: 1,
      available: false,
      storeName: "S",
      description: "word ".repeat(80),
    });
    expect(text.length).toBeLessThanOrEqual(155);
    expect(text.endsWith("…")).toBe(true);
  });
});

describe("category copy", () => {
  it("adds item count and lowest price ahead of the description", () => {
    expect(categoryMetaTitle("Inverters", "Warri")).toBe("Inverters Prices in Warri");
    expect(
      categoryMetaDescription({
        name: "Inverters",
        productCount: 12,
        minPrice: 180000,
        currency: "₦",
        storeName: "SPPD AMAKS",
        description: "Hybrid and pure sine wave inverters.",
      }),
    ).toBe("12 items from ₦180,000. Hybrid and pure sine wave inverters.");
  });

  it("omits counts for an empty category", () => {
    expect(
      categoryMetaDescription({ name: "Fans", productCount: 0, minPrice: null, storeName: "S" }),
    ).toMatch(/^Browse fans/);
  });
});

describe("truncate", () => {
  it("leaves short text alone", () => {
    expect(truncate("  short   text ")).toBe("short text");
  });
});
