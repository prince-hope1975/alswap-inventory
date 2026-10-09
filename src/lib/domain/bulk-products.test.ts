import { describe, expect, it } from "vitest";

import { BULK_PRODUCT_LIMIT, bulkDeleteSummary, bulkSetCategoryInput } from "./bulk-products";

describe("bulkSetCategoryInput", () => {
  it("trims and de-duplicates ids", () => {
    const r = bulkSetCategoryInput.parse({ ids: [" a ", "a", "b"], categoryId: 3 });
    expect(r.ids).toEqual(["a", "b"]);
  });

  it("rejects an empty selection", () => {
    expect(bulkSetCategoryInput.safeParse({ ids: [], categoryId: 3 }).success).toBe(false);
  });

  it("rejects more than the limit of distinct ids", () => {
    const ids = Array.from({ length: BULK_PRODUCT_LIMIT + 1 }, (_, i) => `p${i}`);
    expect(bulkSetCategoryInput.safeParse({ ids, categoryId: 3 }).success).toBe(false);
  });

  it("allows duplicates that collapse under the limit", () => {
    const ids = Array.from({ length: BULK_PRODUCT_LIMIT + 5 }, () => "same");
    expect(bulkSetCategoryInput.parse({ ids, categoryId: 1 }).ids).toEqual(["same"]);
  });

  it("rejects a non-positive category", () => {
    expect(bulkSetCategoryInput.safeParse({ ids: ["a"], categoryId: 0 }).success).toBe(false);
  });
});

describe("bulkDeleteSummary", () => {
  it("mentions skipped products only when there are some", () => {
    expect(bulkDeleteSummary(1, 0)).toBe("Deleted 1 product");
    expect(bulkDeleteSummary(3, 2)).toBe("Deleted 3 products. Kept 2 with sales, purchase or stock history.");
  });
});
