import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BeautyTemplate } from "./beauty-template";
import { BoutiqueTemplate } from "./boutique-template";
import { ClassicTemplate } from "./classic-template";
import { ConversionTemplate } from "./conversion-template";
import { MarketplaceTemplate } from "./marketplace-template";
import { MinimalTemplate } from "./minimal-template";
import type { StoreTemplateProps } from "./modern-template";

const { addItem } = vi.hoisted(() => ({ addItem: vi.fn() }));
vi.mock("../cart-context", () => ({
  useCart: () => ({
    addItem,
    totalItems: 0,
    totalAmount: 0,
    setIsCartOpen: vi.fn(),
  }),
}));
vi.mock("~/hooks/use-tenant-settings", () => ({
  useShopCurrency: () => ({ formatCurrency: (value: number) => `₦${value}` }),
}));
vi.mock("../parts/shop-navbar", () => ({ ShopNavbar: () => <nav>Shop</nav> }));
vi.mock("../parts/product-detail-modal", () => ({
  ProductDetailModal: () => <div role="dialog">Product details</div>,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const product = {
  id: "pump",
  name: "Pump",
  price: "2000000",
  salePrice: null,
  image: null,
  stockQuantity: 3,
  category: null,
} as NonNullable<StoreTemplateProps["products"]>[number];
function props(): StoreTemplateProps {
  return {
    shopDetails: undefined,
    products: [product],
    categories: [],
    isLoading: false,
    search: "",
    setSearch: vi.fn(),
    selectedCategory: undefined,
    setSelectedCategory: vi.fn(),
    config: {
      template: "modern",
      showHero: false,
      showArticles: false,
      themeMode: "light",
    },
    sortBy: "newest",
    setSortBy: vi.fn(),
    priceRange: [0, 3500000],
    setPriceRange: vi.fn(),
    maxPrice: 3500000,
    isPriceFiltered: false,
    hasSearch: false,
    inStockOnly: false,
    setInStockOnly: vi.fn(),
    onClearFilters: vi.fn(),
    totalCount: 25,
    hasMore: true,
    onLoadMore: vi.fn(),
  };
}

describe.each<[string, typeof BeautyTemplate]>([
  ["Beauty", BeautyTemplate],
  ["Boutique", BoutiqueTemplate],
  ["Classic", ClassicTemplate],
  ["Conversion", ConversionTemplate],
  ["Marketplace", MarketplaceTemplate],
  ["Minimal", MinimalTemplate],
])("%s template parity", (_name, Template) => {
  it("uses shared pagination and separate quick view and stock-aware cart buttons", () => {
    const input = props();
    const { container } = render(<Template {...input} />);
    expect(screen.getByText("Showing 1 of 25")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Load more products" }));
    expect(input.onLoadMore).toHaveBeenCalledOnce();
    expect(container.querySelector("button button")).toBeNull();
    const cart = screen.getByRole("button", {
      name: /add .*cart|add to ritual/i,
    });
    expect(cart.className).not.toContain("opacity-0");
    fireEvent.click(cart);
    expect(addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "pump",
        stockQuantity: 3,
        price: 2000000,
      }),
    );
    const quickView = screen
      .getAllByRole("button", { name: /quick view|pump/i })
      .find((button) => button !== cart);
    expect(quickView).toBeDefined();
    fireEvent.click(quickView!);
    expect(screen.getByRole("dialog")).toHaveTextContent("Product details");
  });

  it("shows sold out products without a cart action or waitlist claim", () => {
    const input = props();
    input.products = [{ ...product, stockQuantity: 0 }];
    render(<Template {...input} />);
    const cart = screen.getByRole("button", {
      name: /add .*cart|add to ritual|out of stock/i,
    });
    expect(cart).toBeDisabled();
    fireEvent.click(cart);
    expect(addItem).not.toHaveBeenCalled();
    expect(screen.queryByText(/join waitlist/i)).not.toBeInTheDocument();
  });
});
