import { describe, expect, it } from "vitest";

import {
  salePriceWarning,
  lowStockThresholdWarning,
  optionalNumberInput,
  parseOptionalPrice,
  toProductFormInitialData,
  type ProductFormSource,
} from "./product-form-data";

const base: ProductFormSource = {
  id: "p1",
  name: "LED bulb",
  sku: null,
  barcode: null,
  categoryId: null,
  description: null,
  image: null,
  images: null,
  costPrice: "800.00",
  price: "1500.00",
  salePrice: null,
  stockQuantity: 10,
  lowStockThreshold: null,
};

describe("toProductFormInitialData", () => {
  it("preserves an existing sale price so editing does not wipe it", () => {
    expect(toProductFormInitialData({ ...base, salePrice: "1200.00" }).salePrice).toBe("1200.00");
  });

  it("keeps a zero sale price distinct from no sale", () => {
    expect(toProductFormInitialData({ ...base, salePrice: "0" }).salePrice).toBe("0");
    expect(toProductFormInitialData(base).salePrice).toBeNull();
  });

  it("defaults the low stock threshold to 5 and maps nulls to undefined", () => {
    const data = toProductFormInitialData(base);
    expect(data.lowStockThreshold).toBe(5);
    expect(data.sku).toBeUndefined();
    expect(data.price).toBe("1500.00");
  });
});

describe("parseOptionalPrice", () => {
  it("parses decimal strings and keeps 0", () => {
    expect(parseOptionalPrice("1500.00")).toBe(1500);
    expect(parseOptionalPrice("0")).toBe(0);
  });

  it("returns null for missing values", () => {
    expect(parseOptionalPrice(null)).toBeNull();
    expect(parseOptionalPrice(undefined)).toBeNull();
    expect(parseOptionalPrice("")).toBeNull();
  });
});

describe("optionalNumberInput", () => {
  it("maps an emptied input to null instead of NaN", () => {
    expect(optionalNumberInput("")).toBeNull();
    expect(optionalNumberInput(Number.NaN)).toBeNull();
    expect(optionalNumberInput(undefined)).toBeNull();
  });

  it("parses numbers and numeric strings", () => {
    expect(optionalNumberInput("1200")).toBe(1200);
    expect(optionalNumberInput(0)).toBe(0);
  });
});

describe("lowStockThresholdWarning", () => {
  it("warns when stock is at or below the threshold", () => {
    expect(lowStockThresholdWarning(3, 5)).toMatch(/low stock/);
    expect(lowStockThresholdWarning(5, 5)).toMatch(/low stock/);
  });

  it("stays quiet above the threshold or for untracked stock", () => {
    expect(lowStockThresholdWarning(6, 5)).toBeNull();
    expect(lowStockThresholdWarning(-1, 5)).toBeNull();
  });
});

describe("salePriceWarning", () => {
  it("warns when the sale price is not a discount", () => {
    expect(salePriceWarning(100, 100)).toMatch(/not below/);
    expect(salePriceWarning(100, 150)).toMatch(/not below/);
  });

  it("is quiet for a real discount or no sale price", () => {
    expect(salePriceWarning(100, 80)).toBeNull();
    expect(salePriceWarning(100, null)).toBeNull();
    expect(salePriceWarning(Number.NaN, 80)).toBeNull();
  });
});
