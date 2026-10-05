"use client";

import { useState, useEffect, useMemo, useRef, type CSSProperties } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { api } from "~/trpc/react";
import { CheckoutModal } from "./checkout-modal";
import { CartDrawer } from "./cart-drawer";
import type { StoreConfig } from "~/types/store-config";
import type { SortOption } from "./parts/shop-filters";
import {
  SHOP_PAGE_SIZE,
  normalizePriceFilter,
  priceFilterToQuery,
  priceFilterToRange,
  resolveShopSort,
  type PriceFilter,
  type ShopSortOption,
} from "~/lib/domain/shop-filters";

// Templates
import { ModernTemplate } from "./templates/modern-template";
import { ClassicTemplate } from "./templates/classic-template";
import { MarketplaceTemplate } from "./templates/marketplace-template";
import { MinimalTemplate } from "./templates/minimal-template";
import { BoutiqueTemplate } from "./templates/boutique-template";
import { ConversionTemplate } from "./templates/conversion-template";
import { BeautyTemplate } from "./templates/beauty-template";
import { type RouterOutputs } from "~/trpc/react";
import { StorefrontArticles } from "./parts/storefront-articles";
import { resolveStorefrontTheme } from "~/lib/domain/storefront-theme";
import { PublicStoreUnavailable } from "./public-store-unavailable";
import { trackStorefrontEvent } from "~/components/analytics-consent";

type ShopDetails = RouterOutputs["shop"]["getShopDetails"];
type ProductsPage = RouterOutputs["shop"]["getProducts"];
type Categories = RouterOutputs["shop"]["getCategories"];

interface StoreLayoutProps {
  initialShopDetails?: ShopDetails;
  /** First grid page, prefetched by the server with the same input as the client. */
  initialProducts?: ProductsPage;
  initialCategories?: Categories;
  /** Seeded from the URL so a crawled/shared /shop?search=... renders filtered. */
  initialSearch?: string;
  /** Count `initialSearch` in the demand log (false for our own shortcut links). */
  logInitialSearch?: boolean;
  initialCategoryId?: number;
  /**
   * Fixed for the life of the page: the `used.` surface rewrites `/` to
   * `/shop?condition=USED,REFURBISHED`, and dropping it on the first client
   * refetch would quietly hand back the whole catalogue.
   */
  initialCondition?: ("NEW" | "USED" | "REFURBISHED")[];
  /** Shopper's explicit sort from `?sort=`; undefined = default for the context. */
  initialSort?: ShopSortOption;
}

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function StoreLayout({
  initialShopDetails,
  initialProducts,
  initialCategories,
  initialSearch,
  logInitialSearch = false,
  initialCategoryId,
  initialCondition,
  initialSort,
}: StoreLayoutProps) {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [search, setSearch] = useState(initialSearch ?? "");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(
    initialCategoryId,
  );

  // Filter and sort state. null = the shopper never touched it.
  const [sortChoice, setSortChoice] = useState<ShopSortOption | null>(initialSort ?? null);
  const [priceFilter, setPriceFilter] = useState<PriceFilter>(null);
  const [inStockOnly, setInStockOnly] = useState(false);

  // Debounce search for server-side query (300ms delay)
  const debouncedSearch = useDebounce(search, 300);
  const queryTerm = debouncedSearch.trim();
  // Typing a min/max price should not fire one request per keystroke.
  const debouncedPriceFilter = useDebounce(priceFilter, 400);
  const sortBy = resolveShopSort(sortChoice, queryTerm.length > 0);

  useEffect(() => {
    if (queryTerm.length >= 2) {
      trackStorefrontEvent("search", { search_term: queryTerm });
    }
  }, [queryTerm]);

  // Fetch data with initial data from server
  const { data: shopDetails, isLoading: isShopLoading } =
    api.shop.getShopDetails.useQuery(undefined, {
      initialData: initialShopDetails,
    });
  const { data: categories } = api.shop.getCategories.useQuery(undefined, {
    initialData: initialCategories,
  });

  // Search, category, sort, price and stock all run server-side so paging
  // stays consistent.
  const isInitialQuery =
    queryTerm === (initialSearch ?? "") &&
    selectedCategory === initialCategoryId &&
    sortChoice === (initialSort ?? null) &&
    debouncedPriceFilter === null &&
    !inStockOnly;
  const {
    data: productPages,
    isLoading: isProductsLoading,
    isFetching: isProductsFetching,
    isFetchingNextPage,
    isPlaceholderData: isProductsPlaceholder,
    hasNextPage,
    fetchNextPage,
  } = api.shop.getProducts.useInfiniteQuery(
    {
      search: queryTerm || undefined,
      categoryId: selectedCategory,
      condition: initialCondition,
      sort: sortChoice ?? undefined,
      ...priceFilterToQuery(debouncedPriceFilter),
      inStockOnly: inStockOnly || undefined,
      limit: SHOP_PAGE_SIZE,
    },
    {
      getNextPageParam: (last) => last.nextCursor,
      // The server already ran this exact query for the initial URL, so reuse
      // its result instead of refetching on mount.
      initialData:
        isInitialQuery && initialProducts
          ? { pages: [initialProducts], pageParams: [null] }
          : undefined,
      // Keep previous results on screen while the next filter set loads.
      placeholderData: keepPreviousData,
    },
  );

  const products = useMemo(() => {
    const seen = new Set<string>();
    return (productPages?.pages ?? [])
      .flatMap((page) => page.items)
      .filter((product) => {
        if (seen.has(product.id)) return false;
        seen.add(product.id);
        return true;
      });
  }, [productPages]);
  const firstPage = productPages?.pages[0];
  const totalCount = firstPage?.total ?? 0;
  const priceCeiling = firstPage?.priceCeiling ?? initialProducts?.priceCeiling ?? 0;

  // Keep search/category/sort in the address bar so results can be shared and
  // survive a reload. history.replaceState (not router.replace) avoids
  // re-running the server page on every keystroke; Next syncs useSearchParams.
  // The pathname is kept as-is: on the `used.` host it is `/`, not `/shop`.
  useEffect(() => {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const before = params.toString();
    const setParam = (key: string, value: string | undefined) => {
      if (value) params.set(key, value);
      else params.delete(key);
    };
    setParam("search", queryTerm || undefined);
    // "tile" marks a homepage shortcut; once the shopper edits the term it is theirs.
    if (queryTerm !== (initialSearch ?? "")) params.delete("src");
    setParam("categoryId", selectedCategory?.toString());
    setParam("sort", sortChoice ?? undefined);
    const after = params.toString();
    if (after === before) return;
    window.history.replaceState(null, "", `${url.pathname}${after ? `?${after}` : ""}${url.hash}`);
  }, [queryTerm, selectedCategory, sortChoice, initialSearch]);

  // Demand log: record what customers searched and whether anything matched.
  // Waits longer than the query debounce so "sol", "sola" are not counted on
  // the way to "solar", and skips the term a homepage shortcut arrived with.
  const logSearch = api.demand.logSearch.useMutation();
  const settledSearch = useDebounce(search, 1500);
  const hasTypedRef = useRef(logInitialSearch);
  const lastLoggedRef = useRef<string | null>(null);
  useEffect(() => {
    if (search !== (initialSearch ?? "")) hasTypedRef.current = true;
  }, [search, initialSearch]);
  useEffect(() => {
    const term = settledSearch.trim();
    if (term.length < 2 || !hasTypedRef.current || lastLoggedRef.current === term) return;
    // On the used-stock surface "no results" means "none used", not "not stocked".
    if (initialCondition) return;
    // A term that only matched out-of-stock or out-of-range items is not
    // "not stocked"; only log unfiltered results.
    if (debouncedPriceFilter || inStockOnly) return;
    // Only count results that belong to this exact term: placeholder data
    // still holds the previous search's products while the new one loads.
    if (queryTerm !== term || isProductsPlaceholder || isProductsFetching || !firstPage) {
      return;
    }
    lastLoggedRef.current = term;
    logSearch.mutate({ term, resultCount: firstPage.total });
    // logSearch is a stable mutation object; listing it would re-run on every state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settledSearch, queryTerm, isProductsPlaceholder, isProductsFetching, firstPage, initialCondition, debouncedPriceFilter, inStockOnly]);

  const tenant = shopDetails?.tenant;
  // Safe cast or default for storeConfig since Drizzle might not have fully propagated types in local dev env without restart
  const config = (tenant?.storeConfig as StoreConfig) || {
    template: "modern",
    themeMode: "system",
    showHero: true,
    showArticles: false,
  };

  // Handle Theme Mode
  useEffect(() => {
    const root = document.documentElement;
    const resolvedTheme = resolveStorefrontTheme(
      config.themeMode,
      localStorage.getItem("theme"),
    );
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [config.themeMode]);

  const handleClearFilters = () => {
    setSortChoice(null);
    setPriceFilter(null);
    setInStockOnly(false);
  };

  const commonProps = {
    shopDetails,
    products,
    categories,
    isLoading: isShopLoading || isProductsLoading,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    config,
    // Filter props
    sortBy,
    // Picking the context default again clears the explicit choice, so the
    // URL stays clean and relevance returns when a new search starts.
    setSortBy: (sort: SortOption) =>
      setSortChoice(sort === resolveShopSort(null, queryTerm.length > 0) ? null : sort),
    priceRange: priceFilterToRange(priceFilter, priceCeiling),
    setPriceRange: (range: [number, number]) =>
      setPriceFilter(normalizePriceFilter(range, priceCeiling)),
    maxPrice: priceCeiling,
    isPriceFiltered: priceFilter !== null,
    inStockOnly,
    setInStockOnly,
    onClearFilters: handleClearFilters,
    // Paging + loading
    hasSearch: queryTerm.length > 0,
    totalCount,
    hasMore: Boolean(hasNextPage),
    isFetchingMore: isFetchingNextPage,
    onLoadMore: () => void fetchNextPage(),
    isRefreshing: isProductsFetching && !isFetchingNextPage && !isProductsLoading,
  };

  if (!isShopLoading && shopDetails && !tenant)
    return <PublicStoreUnavailable />;

  return (
    <div
      style={
        {
          "--brand-primary-300": "#8dc5dc",
          "--brand-primary-400": "#45a0c6",
          "--brand-primary-500": "#167da8",
          "--brand-primary-600": "#0b6e99",
          "--brand-primary-700": "#07597d",
          "--brand-primary-800": "#112b3c",
        } as CSSProperties
      }
    >
      {/* Template Resolver */}
      {config.template === "modern" && <ModernTemplate {...commonProps} />}
      {config.template === "classic" && <ClassicTemplate {...commonProps} />}
      {config.template === "marketplace" && (
        <MarketplaceTemplate {...commonProps} />
      )}
      {config.template === "minimal" && <MinimalTemplate {...commonProps} />}
      {config.template === "boutique" && <BoutiqueTemplate {...commonProps} />}
      {config.template === "conversion" && (
        <ConversionTemplate {...commonProps} />
      )}
      {config.template === "beauty" && <BeautyTemplate {...commonProps} />}
      {![
        "modern",
        "classic",
        "marketplace",
        "minimal",
        "boutique",
        "conversion",
        "beauty",
      ].includes(config.template) && <ModernTemplate {...commonProps} />}

      {/* Articles Section */}
      {config.showArticles && <StorefrontArticles limit={6} />}

      {/* Global Cart Drawer */}
      <CartDrawer onCheckout={() => setIsCheckoutOpen(true)} />

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal onClose={() => setIsCheckoutOpen(false)} />
      )}
    </div>
  );
}
