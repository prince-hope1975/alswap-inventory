"use client";

import type { StoreTemplateProps } from "./modern-template";
import { TemplateBrowseControls } from "../parts/template-browse-controls";

import { useState } from "react";
import type { RouterOutputs } from "~/trpc/react";
import { ShopNavbar } from "../parts/shop-navbar";
import { useCart } from "../cart-context";
import { ShoppingBag, Star, Zap } from "lucide-react";
import { useShopCurrency } from "~/hooks/use-tenant-settings";
import { ProductDetailModal } from "../parts/product-detail-modal";
import { ShopFilters } from "../parts/shop-filters";
import { ProductSkeletonGrid } from "../parts/product-skeleton";
import { StockBadge } from "../parts/stock-badge";
import { MarketplaceHeroCarousel } from "../parts/marketplace-hero-carousel";
import { StorefrontImage } from "../storefront-image";

type Products = RouterOutputs["shop"]["getProducts"]["items"];
type Product = Products[number];

export function MarketplaceTemplate(props: StoreTemplateProps) {
  const {
    shopDetails,
    products,
    categories,
    isLoading,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    priceRange,
    setPriceRange,
    inStockOnly,
    setInStockOnly,
    onClearFilters,
    config,

    maxPrice,
    isPriceFiltered,
    hasSearch,
  } = props;
  const tenant = shopDetails?.tenant;
  const { addItem } = useCart();
  const { formatCurrency } = useShopCurrency();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <div className="min-h-screen bg-[#f1f1f2] font-sans text-gray-800 dark:bg-gray-900 dark:text-gray-100">
      {/* Marketplace Navbar - Bright Brand Color */}
      <ShopNavbar
        tenant={tenant}
        search={search}
        setSearch={setSearch}
        className="mb-4 !border-none !bg-[var(--brand-primary-600)] !text-white shadow-md !backdrop-blur-none"
      />

      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Marketplace Hero Layout: Left Menu | Slider | Right Promo */}
        {config.showHero && (
          <div className="mb-6 flex h-[380px] gap-4">
            {/* Left Menu - Categories and Filters */}
            <div className="hidden w-52 overflow-y-auto rounded-lg bg-white shadow-sm lg:block dark:bg-gray-800">
              <div className="flex items-center gap-2 border-b p-3 font-medium dark:border-gray-700">
                <ShoppingBag size={18} /> Categories
              </div>
              <div className="py-2">
                <button
                  onClick={() => setSelectedCategory(undefined)}
                  className={`w-full px-4 py-2 text-left text-xs hover:bg-[var(--brand-primary-50)] hover:text-[var(--brand-primary-600)] dark:hover:bg-gray-700 ${selectedCategory === undefined ? "font-bold text-[var(--brand-primary-600)]" : ""}`}
                >
                  All Categories
                </button>
                {categories?.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`w-full truncate px-4 py-2 text-left text-xs hover:bg-[var(--brand-primary-50)] hover:text-[var(--brand-primary-600)] dark:hover:bg-gray-700 ${selectedCategory === c.id ? "font-bold text-[var(--brand-primary-600)]" : ""}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="mt-2 border-t dark:border-gray-700">
                <ShopFilters
                  hideSort
                  maxPrice={maxPrice}
                  isPriceFiltered={isPriceFiltered}
                  hasSearch={hasSearch}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  priceRange={priceRange}
                  setPriceRange={setPriceRange}
                  inStockOnly={inStockOnly}
                  setInStockOnly={setInStockOnly}
                  onClearFilters={onClearFilters}
                />
              </div>
            </div>

            {/* Middle - Hero Carousel */}
            <div className="flex-1 overflow-hidden rounded-lg">
              <MarketplaceHeroCarousel
                slides={[
                  {
                    title:
                      (config.heroTitle === ""
                        ? undefined
                        : config.heroTitle) ?? "Official Store",
                    description:
                      (config.heroDescription === ""
                        ? undefined
                        : config.heroDescription) ??
                      "Get the best deals on electronics, fashion, and more. Fast delivery nationwide.",
                    image:
                      "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=2070",
                    ctaText: "Shop Now",
                    ctaAction: () =>
                      document
                        .getElementById("marketplace-products")
                        ?.scrollIntoView({ behavior: "smooth" }),
                  },
                  {
                    title: "New Arrivals",
                    description:
                      "Check out the latest products added to our store.",
                    image:
                      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2070",
                    ctaText: "Browse New",
                    ctaAction: () =>
                      document
                        .getElementById("marketplace-products")
                        ?.scrollIntoView({ behavior: "smooth" }),
                  },
                  {
                    title: "Quality Guaranteed",
                    description:
                      "All products are carefully selected and quality checked.",
                    image:
                      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=2070",
                    ctaText: "Learn More",
                    ctaAction: () =>
                      document
                        .getElementById("marketplace-products")
                        ?.scrollIntoView({ behavior: "smooth" }),
                  },
                ]}
              />
            </div>

            {/* Right - Promo Boxes */}
            <div className="hidden w-52 flex-col gap-4 xl:flex">
              <div className="flex flex-1 flex-col items-center justify-center rounded-lg bg-white p-4 text-center shadow-sm dark:bg-gray-800">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)]">
                  <Zap size={20} />
                </div>
                <h4 className="text-sm font-bold uppercase">Flash Sales</h4>
                <p className="mt-1 text-xs text-gray-500">Every Friday</p>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center rounded-lg bg-white p-4 text-center shadow-sm dark:bg-gray-800">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                  <Star size={20} />
                </div>
                <h4 className="text-sm font-bold uppercase">Best Sellers</h4>
                <p className="mt-1 text-xs text-gray-500">Top rated items</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Product Section */}
        <div
          id="marketplace-products"
          className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800"
        >
          <div className="mb-4 flex items-center justify-between border-b pb-2 dark:border-gray-700">
            <h3 className="text-xl font-bold text-[var(--brand-primary-600)]">
              Top Picks For You
            </h3>
            <button
              onClick={() => {
                setSelectedCategory(undefined);
                onClearFilters();
              }}
              className="text-sm font-medium text-[var(--brand-primary-600)] hover:underline"
            >
              See All
            </button>
          </div>

          <TemplateBrowseControls {...props}>
            {isLoading ? (
              <ProductSkeletonGrid count={10} columns={5} />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {products?.map((product, index) => (
                  <div
                    key={product.id}
                    className="group cursor-pointer rounded border border-transparent p-2 transition-shadow hover:border-gray-200 hover:shadow-lg dark:hover:border-gray-700"
                  >
                    <div className="relative mb-2 aspect-square overflow-hidden rounded bg-gray-100 dark:bg-gray-700">
                      {product.image && (
                        <StorefrontImage
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                          priority={index < 5}
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      )}
                      <button
                        type="button"
                        aria-label={`Quick view ${product.name}`}
                        onClick={() => setSelectedProduct(product)}
                        className="absolute inset-0 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] focus-visible:ring-inset"
                      />
                      <StockBadge
                        stockQuantity={product.stockQuantity}
                        className="pointer-events-none absolute top-2 left-2"
                      />
                    </div>
                    <h4 className="mb-1 line-clamp-2 text-xs font-medium group-hover:text-[var(--brand-primary-600)] sm:text-sm">
                      {product.name}
                    </h4>
                    {product.salePrice ? (
                      <>
                        <div className="text-sm font-bold text-red-600 sm:text-base dark:text-red-400">
                          {formatCurrency(Number(product.salePrice))}
                        </div>
                        <div className="text-xs text-gray-400 line-through">
                          {formatCurrency(Number(product.price))}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm font-bold sm:text-base">
                        {formatCurrency(product.price)}
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem({
                          productId: product.id,
                          name: product.name,
                          price: Number(product.price),
                          image: product.image,
                          stockQuantity: product.stockQuantity,
                        });
                      }}
                      disabled={product.stockQuantity === 0}
                      className="mt-2 w-full rounded-sm bg-[var(--brand-primary-600)] py-2 text-xs font-extrabold tracking-wide text-white uppercase opacity-100 shadow-sm transition-all hover:bg-[var(--brand-primary-700)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ADD TO CART
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TemplateBrowseControls>
        </div>
      </main>

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
