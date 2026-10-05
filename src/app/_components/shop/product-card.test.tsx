import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CartProvider } from "./cart-context";
import { ProductCard } from "./product-card";

vi.mock("~/hooks/use-tenant-settings", () => {
  const currency = () => ({
    currency: "₦",
    formatCurrency: (amount: number | string) =>
      `₦${Number(amount).toLocaleString()}`,
  });
  return { useCurrency: currency, useShopCurrency: currency };
});

afterEach(cleanup);

describe("ProductCard", () => {
  it("prioritizes an above-the-fold product image", () => {
    render(
      <CartProvider>
        <ProductCard
          priority
          product={{
            id: "product-1",
            name: "Desoldering pump",
            price: "2500",
            image:
              "https://res.cloudinary.com/diassheoa/image/upload/v1767816036/dfx/product.jpg",
            stockQuantity: 10,
          }}
        />
      </CartProvider>,
    );

    expect(
      screen.getByRole("img", { name: "Desoldering pump" }),
    ).not.toHaveAttribute("loading", "lazy");
  });
});
