import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TemplateBrowseControls } from "./template-browse-controls";
import type { StoreTemplateProps } from "../templates/modern-template";

vi.mock("~/hooks/use-tenant-settings", () => ({
  useShopCurrency: () => ({ formatCurrency: (value: number) => `₦${value}` }),
}));
afterEach(cleanup);

function props(
  overrides: Partial<StoreTemplateProps> = {},
): StoreTemplateProps {
  return {
    shopDetails: undefined,
    products: undefined,
    categories: [
      { id: 1, name: "Tools", productCount: 12, slug: null, description: null },
    ],
    isLoading: false,
    search: "pump",
    setSearch: vi.fn(),
    selectedCategory: 1,
    setSelectedCategory: vi.fn(),
    config: {
      template: "modern",
      showHero: false,
      showArticles: false,
      themeMode: "light",
    },
    sortBy: "price-desc",
    setSortBy: vi.fn(),
    priceRange: [100, 2000000],
    maxPrice: 3500000,
    isPriceFiltered: true,
    hasSearch: true,
    setPriceRange: vi.fn(),
    inStockOnly: true,
    setInStockOnly: vi.fn(),
    onClearFilters: vi.fn(),
    onRetry: vi.fn(),
    onLoadMore: vi.fn(),
    ...overrides,
  };
}
function mount(input: StoreTemplateProps) {
  return render(
    <TemplateBrowseControls {...input}>
      <div>Product grid</div>
    </TemplateBrowseControls>,
  );
}

describe("template browse controls", () => {
  it("removes each active filter through controller callbacks and clears all", () => {
    const input = props();
    mount(input);
    fireEvent.click(
      screen.getByRole("button", { name: "Remove filter Search: pump" }),
    );
    expect(input.setSearch).toHaveBeenCalledWith("");
    fireEvent.click(
      screen.getByRole("button", { name: "Remove filter Tools" }),
    );
    expect(input.setSelectedCategory).toHaveBeenCalledWith(undefined);
    fireEvent.click(
      screen.getByRole("button", { name: "Remove filter ₦100 – ₦2000000" }),
    );
    expect(input.setPriceRange).toHaveBeenCalledWith([0, 3500000]);
    fireEvent.click(
      screen.getByRole("button", { name: "Remove filter In stock" }),
    );
    expect(input.setInStockOnly).toHaveBeenCalledWith(false);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove filter Sort: Price: high to low",
      }),
    );
    expect(input.setSortBy).toHaveBeenCalledWith("relevance");
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(input.onClearFilters).toHaveBeenCalledOnce();
  });

  it("supports accessible mobile filtering, high price bounds, and sorting", () => {
    const input = props({ isPriceFiltered: false, priceRange: [0, 3500000] });
    mount(input);
    fireEvent.change(screen.getByRole("combobox", { name: "Sort by" }), {
      target: { value: "name-asc" },
    });
    expect(input.setSortBy).toHaveBeenCalledWith("name-asc");
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    const dialog = within(
      screen.getByRole("dialog", { name: "Filter & sort" }),
    );
    expect(dialog.getByRole("slider")).toHaveAttribute("max", "3500000");
    fireEvent.change(dialog.getByRole("slider"), {
      target: { value: "2500000" },
    });
    expect(input.setPriceRange).toHaveBeenCalledWith([0, 2500000]);
    fireEvent.click(dialog.getByRole("button", { name: "Tools12" }));
    expect(input.setSelectedCategory).toHaveBeenCalledWith(1);
    fireEvent.click(dialog.getByRole("button", { name: "Clear all" }));
    expect(input.setSearch).toHaveBeenCalledWith("");
    expect(input.onClearFilters).toHaveBeenCalledOnce();
    fireEvent.click(dialog.getByRole("button", { name: "Close filters" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("reports initial loading and refresh state", () => {
    const input = props({ isLoading: true });
    const view = mount(input);
    expect(screen.getByRole("status")).toHaveTextContent("Loading products");
    expect(screen.getByText("Product grid").parentElement).toHaveAttribute(
      "aria-busy",
      "true",
    );
    view.rerender(
      <TemplateBrowseControls {...input} isLoading={false} isRefreshing>
        <div>Product grid</div>
      </TemplateBrowseControls>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Updating results");
  });

  it("shows query errors instead of empty grids and retries", () => {
    const input = props({ loadError: true });
    mount(input);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "couldn't load products",
    );
    expect(screen.queryByText("Product grid")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(input.onRetry).toHaveBeenCalledOnce();
  });

  it("reports loaded and total counts, loads more, and prevents repeated loading", () => {
    const input = props({
      products: [{ id: "one" }] as StoreTemplateProps["products"],
      totalCount: 30,
      hasMore: true,
    });
    const view = mount(input);
    expect(screen.getByText("Showing 1 of 30")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Load more products" }));
    expect(input.onLoadMore).toHaveBeenCalledOnce();
    view.rerender(
      <TemplateBrowseControls {...input} isFetchingMore>
        <div>Product grid</div>
      </TemplateBrowseControls>,
    );
    expect(
      screen.getByRole("button", { name: "Loading more…" }),
    ).toBeDisabled();
    view.rerender(
      <TemplateBrowseControls {...input} hasMore={false}>
        <div>Product grid</div>
      </TemplateBrowseControls>,
    );
    expect(
      screen.queryByRole("button", { name: "Load more products" }),
    ).not.toBeInTheDocument();
  });
  it("opens desktop filters without activating the mobile focus trap", () => {
    mount(
      props({
        search: "",
        selectedCategory: undefined,
        sortBy: "newest",
        hasSearch: false,
        inStockOnly: false,
        isPriceFiltered: false,
        priceRange: [0, 3500000],
      }),
    );
    expect(
      screen.queryByRole("button", { name: /Remove filter/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show filters" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("slider")).toHaveAttribute("max", "3500000");
    fireEvent.click(screen.getByRole("button", { name: "Hide filters" }));
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("keeps cached products visible on an error and disables retry during refresh", () => {
    mount(
      props({
        products: [{ id: "one" }] as StoreTemplateProps["products"],
        loadError: true,
        isRefreshing: true,
      }),
    );
    expect(screen.getByText("Product grid")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeDisabled();
  });
});
