import { describe, expect, it } from "vitest";

import { filterVariants, variantLabel, type VariantOption } from "./variant-combobox";

const options: VariantOption[] = [
  { id: "1", name: "Default", sku: "BAT-200", barcode: null, productName: "Lithium Battery 200Ah" },
  { id: "2", name: "Black", sku: null, barcode: "5901234", productName: "Hybrid Inverter" },
  { id: "3", name: "Default", sku: "CAB-6", barcode: null, productName: "Solar Cable 6mm" },
];

describe("variantLabel", () => {
  it("hides the Default variant name", () => {
    expect(variantLabel(options[0]!)).toBe("Lithium Battery 200Ah");
    expect(variantLabel(options[1]!)).toBe("Hybrid Inverter – Black");
  });
});

describe("filterVariants", () => {
  it("matches product name, variant name, sku and barcode case-insensitively", () => {
    expect(filterVariants(options, "battery").map((o) => o.id)).toEqual(["1"]);
    expect(filterVariants(options, "black").map((o) => o.id)).toEqual(["2"]);
    expect(filterVariants(options, "cab-6").map((o) => o.id)).toEqual(["3"]);
    expect(filterVariants(options, "59012").map((o) => o.id)).toEqual(["2"]);
  });

  it("returns everything (capped) for a blank query", () => {
    expect(filterVariants(options, "  ")).toHaveLength(3);
    expect(filterVariants(options, "", 2)).toHaveLength(2);
  });
});
