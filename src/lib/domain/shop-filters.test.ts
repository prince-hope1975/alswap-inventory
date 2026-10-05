import { describe, expect, it } from "vitest";

import {
  normalizePriceFilter,
  parseShopSort,
  priceFilterToQuery,
  priceFilterToRange,
  resolveShopSort,
  toDisplayCategoryName,
} from "./shop-filters";

describe("price filter default", () => {
  it("applies no bounds until the shopper changes the range", () => {
    // Full range = untouched: inverters above 1M and unpriced items stay.
    expect(normalizePriceFilter([0, 2_500_000], 2_500_000)).toBeNull();
    expect(priceFilterToQuery(null)).toEqual({});
  });

  it("shows the real catalogue max on the controls when untouched", () => {
    expect(priceFilterToRange(null, 2_500_000)).toEqual([0, 2_500_000]);
  });

  it("filters once the shopper narrows the range", () => {
    const filter = normalizePriceFilter([0, 50_000], 2_500_000);
    expect(filter).toEqual({ min: 0, max: 50_000 });
    // A zero minimum stays unbounded so ₦0 (price on request) items remain.
    expect(priceFilterToQuery(filter)).toEqual({ minPrice: undefined, maxPrice: 50_000 });
  });

  it("keeps a raised minimum and never lets max fall below min", () => {
    expect(normalizePriceFilter([10_000, 5_000], 100_000)).toEqual({
      min: 10_000,
      max: 10_000,
    });
    expect(priceFilterToQuery({ min: 10_000, max: 20_000 })).toEqual({
      minPrice: 10_000,
      maxPrice: 20_000,
    });
  });

  it("treats a widened max beyond the ceiling as no filter", () => {
    expect(normalizePriceFilter([0, 9_999_999], 100_000)).toBeNull();
  });
});

describe("relevance sort selection", () => {
  it("defaults to relevance while a search is active", () => {
    expect(resolveShopSort(null, true)).toBe("relevance");
  });

  it("defaults to newest without a search", () => {
    expect(resolveShopSort(null, false)).toBe("newest");
  });

  it("lets an explicit choice win over relevance", () => {
    expect(resolveShopSort("price-asc", true)).toBe("price-asc");
  });

  it("falls back to newest when relevance is chosen without a search", () => {
    expect(resolveShopSort("relevance", false)).toBe("newest");
  });

  it("parses only known sort values from the URL", () => {
    expect(parseShopSort("price-desc")).toBe("price-desc");
    expect(parseShopSort("drop table")).toBeNull();
    expect(parseShopSort(undefined)).toBeNull();
  });
});

describe("toDisplayCategoryName", () => {
  it("title-cases lowercase words without lowercasing acronyms", () => {
    expect(toDisplayCategoryName("cables and wires")).toBe("Cables And Wires");
    expect(toDisplayCategoryName("LED bulbs")).toBe("LED Bulbs");
    expect(toDisplayCategoryName("5kVA inverters")).toBe("5kVA Inverters");
    expect(toDisplayCategoryName("  MCB/breakers ")).toBe("MCB/Breakers");
  });
});
