import { describe, expect, it } from "vitest";

import { calculateWeightedAverageCost, convertQuantity } from "./inventory";

describe("inventory calculations", () => {
  it("calculates weighted average cost for received stock", () => {
    expect(
      calculateWeightedAverageCost({
        currentQuantity: 10,
        currentUnitCost: 1000,
        receivedQuantity: 5,
        receivedUnitCost: 1300,
      }),
    ).toBe(1100);
  });

  it("converts packs and lengths into a base stock unit", () => {
    expect(convertQuantity({ quantity: 3, conversionFactor: 12 })).toBe(36);
    expect(convertQuantity({ quantity: 2.5, conversionFactor: 10 })).toBe(25);
  });
});
