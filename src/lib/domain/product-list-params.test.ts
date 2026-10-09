import { describe, expect, it } from "vitest";

import { compareStockAsc, parseProductListParams, productListQuery, stockStatus } from "./product-list-params";

describe("parseProductListParams", () => {
  it("returns defaults for an empty query", () => {
    expect(parseProductListParams({})).toEqual({
      search: undefined,
      hasImage: undefined,
      stock: undefined,
      sort: "newest",
      categoryId: undefined,
      page: 1,
    });
  });

  it("parses known values", () => {
    expect(
      parseProductListParams({
        search: "  bulb ",
        hasImage: "false",
        stock: "low",
        sort: "stock-asc",
        category: "12",
        page: "3",
      }),
    ).toEqual({ search: "bulb", hasImage: false, stock: "low", sort: "stock-asc", categoryId: 12, page: 3 });
  });

  it("ignores unknown or malformed values", () => {
    expect(
      parseProductListParams({ stock: "lots", sort: "random", category: "abc", page: "-2", hasImage: "maybe" }),
    ).toMatchObject({ stock: undefined, sort: "newest", categoryId: undefined, page: 1, hasImage: undefined });
  });

  it("takes the first value of repeated params", () => {
    expect(parseProductListParams({ stock: ["out", "low"] }).stock).toBe("out");
  });

  it("round-trips through productListQuery, omitting defaults", () => {
    expect(productListQuery({ sort: "newest", page: 1 })).toBe("");
    const query = productListQuery({ stock: "low", sort: "name", categoryId: 4, page: 2 });
    expect(query).toBe("?stock=low&sort=name&category=4&page=2");
    expect(parseProductListParams(Object.fromEntries(new URLSearchParams(query)))).toMatchObject({
      stock: "low",
      sort: "name",
      categoryId: 4,
      page: 2,
    });
  });
});

describe("stockStatus", () => {
  it("classifies untracked, out, low and ok", () => {
    expect(stockStatus(-1, 5)).toBe("untracked");
    expect(stockStatus(0, 5)).toBe("out");
    expect(stockStatus(5, 5)).toBe("low");
    expect(stockStatus(6, 5)).toBe("ok");
  });

  it("defaults the threshold to 5 when unset", () => {
    expect(stockStatus(5, null)).toBe("low");
    expect(stockStatus(6, undefined)).toBe("ok");
  });
});

describe("compareStockAsc", () => {
  it("sorts tracked stock low to high and untracked (-1) last", () => {
    const rows = [
      { name: "U", stockQuantity: -1 },
      { name: "B", stockQuantity: 5 },
      { name: "A", stockQuantity: 0 },
      { name: "C", stockQuantity: 5 },
    ];
    expect([...rows].sort(compareStockAsc).map((r) => r.name)).toEqual(["A", "B", "C", "U"]);
  });
});
