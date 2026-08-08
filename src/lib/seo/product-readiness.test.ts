import { describe, expect, it } from "vitest";

import { productSearchReadiness } from "./product-readiness";

describe("productSearchReadiness", () => {
  it("identifies the public details a product still needs", () => {
    expect(
      productSearchReadiness({
        name: "Cable",
        description: "Short",
        image: null,
        images: [],
        categoryName: null,
        brand: null,
        sku: null,
        gtin: null,
        mpn: null,
        price: "1000",
        stockQuantity: 2,
      }),
    ).toEqual({
      ready: false,
      completed: 3,
      total: 7,
      missing: [
        "image",
        "useful description",
        "category",
        "brand or product identifier",
      ],
    });
  });

  it("marks a complete, purchasable listing ready", () => {
    expect(
      productSearchReadiness({
        name: "2m MO cable",
        description:
          "A two-metre charging cable for compatible mobile devices.",
        image: "https://e/image.jpg",
        images: [],
        categoryName: "Cables",
        brand: "MO",
        sku: null,
        gtin: null,
        mpn: null,
        price: "1800",
        stockQuantity: -1,
      }).ready,
    ).toBe(true);
  });
});
