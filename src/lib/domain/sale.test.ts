import { describe, expect, it } from "vitest";

import { prepareSale } from "./sale";

describe("prepareSale", () => {
  it("uses server prices and rejects client price tampering", () => {
    const sale = prepareSale({
      requested: [{ productId: "p1", quantity: 2, clientPrice: 1 }],
      products: [{ id: "p1", price: 1500, salePrice: null, stockQuantity: 5 }],
    });
    expect(sale.total).toBe(3000);
    expect(sale.lines[0]?.unitPrice).toBe(1500);
  });

  it("blocks insufficient stock", () => {
    expect(() => prepareSale({
      requested: [{ productId: "p1", quantity: 3 }],
      products: [{ id: "p1", price: 1500, salePrice: null, stockQuantity: 2 }],
    })).toThrow("Insufficient stock for p1");
  });
});
