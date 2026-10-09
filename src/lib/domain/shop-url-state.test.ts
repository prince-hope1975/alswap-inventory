import { describe, expect, it } from "vitest";

import {
  compareForSort,
  normalizePriceFilter,
  parseShopUrlState,
  priceFilterToQuery,
  priceFilterToRange,
  serializeShopUrlState,
  shopHistoryMode,
  type ShopUrlState,
  type SortableProduct,
} from "./shop-filters";

const empty: ShopUrlState = {
  search: "",
  categoryId: undefined,
  sort: null,
  price: null,
  inStock: false,
};

describe("parseShopUrlState", () => {
  it("reads every filter from client search params", () => {
    const state = parseShopUrlState(
      new URLSearchParams("search=cable&categoryId=4&sort=price-asc&minPrice=100&maxPrice=5000&inStock=1"),
    );
    expect(state).toEqual({
      search: "cable",
      categoryId: 4,
      sort: "price-asc",
      price: { min: 100, max: 5000 },
      inStock: true,
    });
  });

  it("reads server searchParams records (first value wins)", () => {
    const state = parseShopUrlState({ search: ["bulb", "x"], minPrice: "250" });
    expect(state.search).toBe("bulb");
    expect(state.price).toEqual({ min: 250, max: Number.POSITIVE_INFINITY });
  });

  it("drops invalid values instead of passing them on", () => {
    const state = parseShopUrlState(
      new URLSearchParams("categoryId=-2&sort=hack&minPrice=abc&maxPrice=-1&inStock=yes"),
    );
    expect(state).toEqual(empty);
  });

  it("never lets max fall below min", () => {
    expect(parseShopUrlState(new URLSearchParams("minPrice=500&maxPrice=100")).price).toEqual({
      min: 500,
      max: 500,
    });
  });
});

describe("serializeShopUrlState", () => {
  it("round-trips through parse", () => {
    const state: ShopUrlState = {
      search: "solar panel",
      categoryId: 7,
      sort: "name-asc",
      price: { min: 0, max: 20000 },
      inStock: true,
    };
    expect(parseShopUrlState(serializeShopUrlState(state))).toEqual(state);
  });

  it("keeps unrelated params and removes cleared filters", () => {
    const base = new URLSearchParams("condition=USED&search=old&inStock=1&minPrice=5");
    const out = serializeShopUrlState(empty, base);
    expect(out.toString()).toBe("condition=USED");
    // The input is not mutated.
    expect(base.get("search")).toBe("old");
  });

  it("omits an open-ended max", () => {
    const out = serializeShopUrlState({ ...empty, price: { min: 300, max: Number.POSITIVE_INFINITY } });
    expect(out.toString()).toBe("minPrice=300");
  });
});

describe("shopHistoryMode", () => {
  it("pushes discrete changes so Back undoes them", () => {
    expect(shopHistoryMode(empty, { ...empty, categoryId: 3 })).toBe("push");
    expect(shopHistoryMode(empty, { ...empty, sort: "price-desc" })).toBe("push");
    expect(shopHistoryMode(empty, { ...empty, inStock: true })).toBe("push");
  });

  it("replaces while typing", () => {
    expect(shopHistoryMode(empty, { ...empty, search: "cab" })).toBe("replace");
    expect(shopHistoryMode(empty, { ...empty, price: { min: 10, max: 20 } })).toBe("replace");
  });
});

describe("open-ended price filters", () => {
  it("treats a max at the ceiling as no upper bound when a min is set", () => {
    const filter = normalizePriceFilter([1000, 50_000], 50_000);
    expect(filter).toEqual({ min: 1000, max: Number.POSITIVE_INFINITY });
    expect(priceFilterToQuery(filter)).toEqual({ minPrice: 1000, maxPrice: undefined });
    expect(priceFilterToRange(filter, 50_000)).toEqual([1000, 50_000]);
  });
});

describe("compareForSort", () => {
  const make = (id: string, price: number, hasImage: boolean, createdAt: number): SortableProduct => ({
    id,
    price,
    hasImage,
    createdAt,
    name: id,
  });
  const items = [
    make("a", 0, true, 5),
    make("b", 500, false, 4),
    make("c", 100, true, 3),
    make("d", 900, true, 6),
  ];
  const order = (sort: Parameters<typeof compareForSort>[0]) =>
    [...items].sort((x, y) => compareForSort(sort, x, y)).map((p) => p.id);

  it("sinks price-on-request items to the end of both price sorts", () => {
    expect(order("price-asc")).toEqual(["c", "b", "d", "a"]);
    expect(order("price-desc")).toEqual(["d", "b", "c", "a"]);
  });

  it("puts products with photos first under newest", () => {
    expect(order("newest")).toEqual(["d", "a", "c", "b"]);
  });
});

describe("meaningfulDescription", () => {
  it("drops filler and title echoes", async () => {
    const { meaningfulDescription } = await import("./shop-filters");
    expect(meaningfulDescription("Good", "2.5mm cable")).toBeNull();
    expect(meaningfulDescription("  ", "x")).toBeNull();
    expect(meaningfulDescription("2.5MM Twin Cable (100m)", "2.5mm twin cable 100m")).toBeNull();
    expect(meaningfulDescription("Copper, 100 metres, red and black.", "2.5mm cable")).toBe(
      "Copper, 100 metres, red and black.",
    );
  });
});
