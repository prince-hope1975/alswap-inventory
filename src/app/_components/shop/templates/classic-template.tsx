"use client";

import type { StoreTemplateProps } from "./modern-template";
import { TemplateBrowseControls } from "../parts/template-browse-controls";

import { useState } from "react";
import type { RouterOutputs } from "~/trpc/react";
import { ShopNavbar } from "../parts/shop-navbar";
import { ShopFilters } from "../parts/shop-filters";
import { ProductSkeletonGrid } from "../parts/product-skeleton";
import { ProductDetailModal } from "../parts/product-detail-modal";
import { StockBadge } from "../parts/stock-badge";
import { useCart } from "../cart-context";
import { Menu, ChevronRight } from "lucide-react";
import { useShopCurrency } from "~/hooks/use-tenant-settings";
import { StorefrontImage } from "../storefront-image";

type Products = RouterOutputs["shop"]["getProducts"]["items"];
type Product = Products[number];

export function ClassicTemplate(props: StoreTemplateProps) {
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

    maxPrice,
    isPriceFiltered,
    hasSearch,
  } = props;
  const tenant = shopDetails?.tenant;
  const { addItem } = useCart();
  const { formatCurrency } = useShopCurrency();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const selectedCategoryName = categories?.find(
    (c) => c.id === selectedCategory,
  )?.name;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <ShopNavbar
        tenant={tenant}
        search={search}
        setSearch={setSearch}
        className="!border-none !bg-white !backdrop-blur-none dark:!bg-gray-900"
      />

      <div className="flex gap-6 overflow-x-auto bg-[var(--brand-primary-800)] px-4 py-3 pt-36 text-sm font-medium text-white md:pt-24">
        <button
          onClick={() => setSelectedCategory(undefined)}
          className={`flex items-center gap-2 whitespace-nowrap transition-colors hover:text-[var(--brand-primary-200)] ${selectedCategory === undefined ? "font-bold text-white" : ""}`}
        >
          <Menu className="h-4 w-4" />
          All Departments
        </button>
        {categories?.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`whitespace-nowrap transition-colors hover:text-[var(--brand-primary-200)] ${selectedCategory === c.id ? "font-bold text-white" : ""}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span>Home</span>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-gray-900 dark:text-white">
            {(selectedCategoryName === "" ? undefined : selectedCategoryName) ??
              "All Products"}
          </span>
        </div>

        <div className="flex gap-8">
          <div className="hidden w-72 flex-shrink-0 space-y-6 lg:block">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-bold">Departments</h3>
              <div className="flex flex-col items-start gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(undefined)}
                >
                  All Departments
                </button>
                {categories?.map((category) => (
                  <button
                    type="button"
                    key={category.id}
                    aria-pressed={selectedCategory === category.id}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
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

          <div className="flex-1">
            <div className="mb-6">
              <h2 className="mb-2 text-2xl font-bold">
                {(selectedCategoryName === ""
                  ? undefined
                  : selectedCategoryName) ?? "All Products"}
              </h2>
            </div>

            <TemplateBrowseControls {...props} desktopFilters={false}>
              {isLoading ? (
                <ProductSkeletonGrid count={8} columns={4} />
              ) : products && products.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {products.map((product, index) => (
                    <div
                      key={product.id}
                      className="group relative rounded-xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
                    >
                      <button
                        type="button"
                        aria-label={`Quick view ${product.name}`}
                        className="relative mb-4 aspect-square w-full cursor-pointer overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700"
                        onClick={() => setSelectedProduct(product)}
                      >
                        {product.image && (
                          <StorefrontImage
                            src={product.image}
                            alt={product.name}
                            fill
                            sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) 50vw, 25vw"
                            priority={index < 4}
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        )}
                        <StockBadge
                          stockQuantity={product.stockQuantity}
                          className="absolute top-2 right-2"
                        />
                      </button>
                      <h3 className="mb-2 line-clamp-2 cursor-pointer text-base font-semibold transition-colors hover:text-[var(--brand-primary-600)]">
                        <button
                          type="button"
                          onClick={() => setSelectedProduct(product)}
                        >
                          {product.name}
                        </button>
                      </h3>
                      <div className="mb-3 flex items-baseline gap-2">
                        {product.salePrice ? (
                          <>
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                              {formatCurrency(Number(product.salePrice))}
                            </div>
                            <div className="text-sm text-gray-400 line-through">
                              {formatCurrency(Number(product.price))}
                            </div>
                          </>
                        ) : (
                          <div className="text-2xl font-bold">
                            {formatCurrency(product.price)}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          addItem({
                            productId: product.id,
                            name: product.name,
                            price: Number(product.salePrice ?? product.price),
                            image: product.image,
                            stockQuantity: product.stockQuantity,
                          })
                        }
                        disabled={product.stockQuantity === 0}
                        className="w-full rounded-lg border border-transparent bg-[var(--brand-primary-600)] py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--brand-primary-700)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {product.stockQuantity === 0
                          ? "Out of Stock"
                          : "Add to Cart"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white p-16 text-center dark:border-gray-700 dark:bg-gray-800">
                  <p className="mb-2 text-lg font-medium">No products found</p>
                  <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    Try adjusting your filters
                  </p>
                  <button
                    onClick={() => {
                      setSearch("");
                      setSelectedCategory(undefined);
                      onClearFilters();
                    }}
                    className="font-semibold text-[var(--brand-primary-600)] transition-colors hover:text-[var(--brand-primary-700)]"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </TemplateBrowseControls>
          </div>
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
