"use client";

import { useId, useState } from "react";
import { AlertTriangle, Loader2, MessageCircle, RefreshCw, SearchX, SlidersHorizontal, X } from "lucide-react";
import { type RouterOutputs } from "~/trpc/react";
import { ProductCard } from "../product-card";
import { ShopNavbar, MOBILE_SEARCH_INPUT_ID } from "../parts/shop-navbar";
import { ShopHero } from "../parts/shop-hero";
import { ShopSidebar } from "../parts/shop-sidebar";
import { ShopFilters, SORT_LABELS, type SortOption } from "../parts/shop-filters";
import { ProductSkeletonGrid } from "../parts/product-skeleton";
import { ProductDetailModal } from "../parts/product-detail-modal";
import { CategoryCarousel } from "../parts/category-carousel";
import { MobileFilterDrawer } from "../parts/mobile-filter-drawer";
import { MobileBottomNav } from "../parts/mobile-bottom-nav";
import { LoadMoreButton } from "../parts/load-more-button";
import { useShopCurrency } from "~/hooks/use-tenant-settings";
import type { StoreConfig } from "~/types/store-config";

type ShopDetails = RouterOutputs["shop"]["getShopDetails"];
type Products = RouterOutputs["shop"]["getProducts"]["items"];
type Categories = RouterOutputs["shop"]["getCategories"];
type Product = Products[number];

interface ModernTemplateProps {
    shopDetails: ShopDetails | undefined;
    products: Products | undefined;
    categories: Categories | undefined;
    isLoading: boolean;
    search: string;
    setSearch: (value: string) => void;
    selectedCategory: number | undefined;
    setSelectedCategory: (id: number | undefined) => void;
    config: StoreConfig;
    sortBy: SortOption;
    setSortBy: (sort: SortOption) => void;
    priceRange: [number, number];
    setPriceRange: (range: [number, number]) => void;
    inStockOnly: boolean;
    setInStockOnly: (value: boolean) => void;
    onClearFilters: () => void;
    maxPrice?: number;
    isPriceFiltered?: boolean;
    hasSearch?: boolean;
    totalCount?: number;
    hasMore?: boolean;
    isFetchingMore?: boolean;
    onLoadMore?: () => void;
    /** A new filter set is loading while the previous results stay on screen. */
    isRefreshing?: boolean;
    /** The product query failed (and nothing is cached to show). */
    loadError?: boolean;
    onRetry?: () => void;
}

function whatsappHref(phone: string, term: string) {
    const message = term
        ? `Hello, do you have "${term}"? I couldn't find it on the website.`
        : "Hello, I'm looking for a product I couldn't find on the website.";
    return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

export function ModernTemplate({
    shopDetails,
    products,
    categories,
    isLoading,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    config,
    sortBy,
    setSortBy,
    priceRange,
    setPriceRange,
    inStockOnly,
    setInStockOnly,
    onClearFilters,
    maxPrice = 0,
    isPriceFiltered = false,
    hasSearch = false,
    totalCount,
    hasMore = false,
    isFetchingMore = false,
    onLoadMore,
    isRefreshing = false,
    loadError = false,
    onRetry,
}: ModernTemplateProps) {
    const tenant = shopDetails?.tenant;
    const { formatCurrency } = useShopCurrency();
    const sortId = useId();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

    const term = search.trim();
    const shown = products?.length ?? 0;
    const total = totalCount ?? shown;
    const selectedCategoryName = categories?.find((c) => c.id === selectedCategory)?.name;
    const activeFilterCount =
        (selectedCategoryName ? 1 : 0) + (isPriceFiltered ? 1 : 0) + (inStockOnly ? 1 : 0);
    const sortOptions = (Object.keys(SORT_LABELS) as SortOption[]).filter(
        (option) => option !== "relevance" || hasSearch,
    );

    const clearEverything = () => {
        setSearch("");
        setSelectedCategory(undefined);
        onClearFilters();
    };

    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (term) chips.push({ key: "search", label: `“${term}”`, onRemove: () => setSearch("") });
    if (selectedCategoryName)
        chips.push({ key: "category", label: selectedCategoryName, onRemove: () => setSelectedCategory(undefined) });
    if (isPriceFiltered)
        chips.push({
            key: "price",
            label: `${formatCurrency(priceRange[0])} – ${formatCurrency(priceRange[1])}`,
            onRemove: () => setPriceRange([0, maxPrice]),
        });
    if (inStockOnly) chips.push({ key: "stock", label: "In stock", onRemove: () => setInStockOnly(false) });

    const suggestedCategories = [...(categories ?? [])]
        .sort((a, b) => b.productCount - a.productCount)
        .slice(0, 6);

    return (
        <div className="min-h-screen bg-[#f6f4ee] font-sans text-[#14212b] selection:bg-[#f5a623]/40 dark:bg-[#0a1117] dark:text-white">
            <ShopNavbar
                tenant={tenant}
                search={search}
                setSearch={setSearch}
                showSearch={true}
                className="bg-[#f6f4ee]/95 dark:bg-[#0a1117]/95"
            />

            {config.showHero && (
                <ShopHero
                    tenantName={tenant?.name}
                    heroTitle={config.heroTitle}
                    description={config.heroDescription}
                />
            )}

            <div
                id="products"
                className={`container mx-auto scroll-mt-[124px] px-4 pb-28 md:scroll-mt-24 lg:pb-16 ${config.showHero ? "pt-4 md:pt-6" : "pt-[136px] md:pt-28"}`}
            >
                <CategoryCarousel
                    className="-mx-1 mb-2 lg:hidden"
                    categories={categories}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                />

                <div className="flex gap-8">
                    <aside className="hidden w-64 shrink-0 lg:block">
                        <div className="sticky top-28 max-h-[calc(100vh-8rem)] space-y-6 overflow-y-auto rounded-xl border border-[#14212b]/12 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
                            <ShopSidebar
                                categories={categories}
                                selectedCategory={selectedCategory}
                                setSelectedCategory={setSelectedCategory}
                            />
                            <div className="border-t border-[#14212b]/10 pt-5 dark:border-white/10">
                                <ShopFilters
                                    hideSort
                                    sortBy={sortBy}
                                    setSortBy={setSortBy}
                                    priceRange={priceRange}
                                    setPriceRange={setPriceRange}
                                    maxPrice={maxPrice}
                                    hasSearch={hasSearch}
                                    isPriceFiltered={isPriceFiltered}
                                    inStockOnly={inStockOnly}
                                    setInStockOnly={setInStockOnly}
                                    onClearFilters={onClearFilters}
                                />
                            </div>
                        </div>
                    </aside>

                    <main className="min-w-0 flex-1">
                        {/* Results toolbar */}
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="flex min-w-0 items-center gap-2 text-sm text-[#41515c] dark:text-gray-300" aria-live="polite">
                                {isLoading ? (
                                    "Loading products…"
                                ) : (
                                    <span className="truncate">
                                        <strong className="font-semibold text-[#14212b] dark:text-white">{total}</strong>{" "}
                                        {total === 1 ? "product" : "products"}
                                        {selectedCategoryName && !term ? ` in ${selectedCategoryName}` : ""}
                                        {term ? ` for “${term}”` : ""}
                                    </span>
                                )}
                                {isRefreshing && (
                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#0b6e99]" aria-label="Updating results" />
                                )}
                            </p>
                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsFilterDrawerOpen(true)}
                                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#14212b]/15 bg-white px-3 text-sm font-semibold text-[#14212b] focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:outline-none lg:hidden dark:border-white/15 dark:bg-white/5 dark:text-white"
                                >
                                    <SlidersHorizontal className="h-4 w-4" aria-hidden />
                                    Filter
                                    {activeFilterCount > 0 && (
                                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0b6e99] px-1 text-[11px] text-white">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </button>
                                <label htmlFor={sortId} className="sr-only">
                                    Sort by
                                </label>
                                <select
                                    id={sortId}
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                                    className="min-h-10 max-w-[11rem] cursor-pointer rounded-lg border border-[#14212b]/15 bg-white px-2.5 text-sm font-medium text-[#14212b] focus:border-[#0b6e99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b6e99]/30 dark:border-white/15 dark:bg-[#0f1a22] dark:text-white"
                                >
                                    {sortOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {SORT_LABELS[option]}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Active filter chips */}
                        {chips.length > 0 && (
                            <div className="mb-4 flex flex-wrap items-center gap-2">
                                {chips.map((chip) => (
                                    <button
                                        key={chip.key}
                                        type="button"
                                        onClick={chip.onRemove}
                                        aria-label={`Remove filter ${chip.label}`}
                                        className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-[#0b6e99]/30 focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:outline-none bg-[#dcecf2] px-3 text-xs font-semibold text-[#07597d] hover:border-[#0b6e99] dark:border-[#8dc5dc]/30 dark:bg-[#0b6e99]/20 dark:text-[#8dc5dc]"
                                    >
                                        <span className="truncate">{chip.label}</span>
                                        <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                    </button>
                                ))}
                                {chips.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={clearEverything}
                                        className="min-h-9 rounded px-2 text-xs font-semibold text-[#41515c] underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:outline-none dark:text-gray-300"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>
                        )}

                        {loadError && !(products && products.length > 0) ? (
                            <div role="alert" className="flex flex-col items-center rounded-xl border border-[#14212b]/12 bg-white px-6 py-12 text-center dark:border-white/10 dark:bg-white/[0.03]">
                                <AlertTriangle className="mb-3 h-10 w-10 text-[#b45309]" aria-hidden />
                                <h2 className="text-lg font-bold">We couldn&apos;t load products</h2>
                                <p className="mt-1 max-w-md text-sm text-[#5c6870] dark:text-gray-400">
                                    Check your connection and try again.
                                </p>
                                {onRetry && (
                                    <button
                                        type="button"
                                        onClick={onRetry}
                                        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0b6e99] px-5 text-sm font-semibold text-white hover:bg-[#07597d] focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:ring-offset-2 focus-visible:outline-none"
                                    >
                                        <RefreshCw className="h-4 w-4" aria-hidden />
                                        Try again
                                    </button>
                                )}
                            </div>
                        ) : isLoading ? (
                            <ProductSkeletonGrid count={8} columns={4} />
                        ) : products && products.length > 0 ? (
                            <>
                                <div
                                    aria-busy={isRefreshing}
                                    className={`grid grid-cols-2 gap-3 transition-opacity sm:gap-4 md:grid-cols-3 xl:grid-cols-4 ${isRefreshing ? "pointer-events-none opacity-60" : ""}`}
                                >
                                    {products.map((product, index) => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            priority={index < 4}
                                            onQuickView={() => setSelectedProduct(product)}
                                        />
                                    ))}
                                </div>
                                <div className="mt-8 flex flex-col items-center gap-3">
                                    <p className="text-sm text-[#5c6870] dark:text-gray-400">
                                        Showing {shown} of {total}
                                    </p>
                                    {onLoadMore && (
                                        <LoadMoreButton onClick={onLoadMore} isLoading={isFetchingMore} hasMore={hasMore} />
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center rounded-xl border border-[#14212b]/12 bg-white px-6 py-12 text-center dark:border-white/10 dark:bg-white/[0.03]">
                                <SearchX className="mb-3 h-10 w-10 text-[#8a949a]" aria-hidden />
                                <h2 className="text-lg font-bold text-[#14212b] dark:text-white">
                                    {term && selectedCategoryName
                                        ? `No “${term}” in ${selectedCategoryName}`
                                        : term
                                          ? `No results for “${term}”`
                                          : "No products match these filters"}
                                </h2>
                                <p className="mt-1 max-w-md text-sm text-[#5c6870] dark:text-gray-400">
                                    {term && selectedCategoryName
                                        ? "It may be listed under another department."
                                        : term
                                          ? "Check the spelling, try a shorter term, or browse a category."
                                          : "Try removing a filter or browse another category."}
                                </p>
                                {term && selectedCategoryName && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCategory(undefined)}
                                        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0b6e99] px-5 text-sm font-semibold text-white hover:bg-[#07597d] focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-[#0a1117]"
                                    >
                                        <SearchX className="h-4 w-4" aria-hidden />
                                        Search “{term}” in all categories
                                    </button>
                                )}
                                {suggestedCategories.length > 0 && !(term && selectedCategoryName) && (
                                    <div className="mt-5 flex max-w-xl flex-wrap justify-center gap-2">
                                        {suggestedCategories.map((category) => (
                                            <button
                                                key={category.id}
                                                type="button"
                                                onClick={() => {
                                                    setSearch("");
                                                    onClearFilters();
                                                    setSelectedCategory(category.id);
                                                }}
                                                className="min-h-10 rounded-full border border-[#14212b]/15 px-4 text-sm font-medium hover:border-[#0b6e99] hover:text-[#07597d] dark:border-white/15 dark:hover:text-[#8dc5dc]"
                                            >
                                                {category.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-6 flex flex-wrap justify-center gap-3">
                                    <button
                                        type="button"
                                        onClick={clearEverything}
                                        className="min-h-11 rounded-lg border border-[#14212b]/20 px-5 text-sm font-semibold hover:bg-[#14212b]/5 dark:border-white/20 dark:hover:bg-white/10"
                                    >
                                        Clear search & filters
                                    </button>
                                    {tenant?.phone && (
                                        <a
                                            href={whatsappHref(tenant.phone, term)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#1f8f4e] px-5 text-sm font-semibold text-white hover:bg-[#187a42]"
                                        >
                                            <MessageCircle className="h-4 w-4" aria-hidden />
                                            Ask us on WhatsApp
                                        </a>
                                    )}
                                </div>
                                {tenant?.phone && (
                                    <p className="mt-3 text-xs text-[#5c6870] dark:text-gray-400">
                                        Not everything we stock is listed online yet.
                                    </p>
                                )}
                            </div>
                        )}
                    </main>
                </div>
            </div>

            <MobileFilterDrawer
                isOpen={isFilterDrawerOpen}
                onClose={() => setIsFilterDrawerOpen(false)}
                sortBy={sortBy}
                setSortBy={setSortBy}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                maxPrice={maxPrice}
                hasSearch={hasSearch}
                isPriceFiltered={isPriceFiltered}
                inStockOnly={inStockOnly}
                setInStockOnly={setInStockOnly}
                onClearFilters={onClearFilters}
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                resultCount={total}
            />

            <MobileBottomNav
                activeFilterCount={activeFilterCount}
                onFilterClick={() => setIsFilterDrawerOpen(true)}
                onSearchClick={() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    document.getElementById(MOBILE_SEARCH_INPUT_ID)?.focus({ preventScroll: true });
                }}
            />

            {selectedProduct && (
                <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
            )}
        </div>
    );
}
