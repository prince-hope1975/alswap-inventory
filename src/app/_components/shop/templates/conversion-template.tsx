"use client";

import type { StoreTemplateProps } from "./modern-template";
import { TemplateBrowseControls } from "../parts/template-browse-controls";

import { useState } from "react";
import Link from "next/link";
import type { RouterOutputs } from "~/trpc/react";
import { ShopNavbar } from "../parts/shop-navbar";
import { useCart } from "../cart-context";
import { productPath } from "~/lib/domain/slug";
import {
  ChevronDown,
  ShoppingCart,
  Truck,
  RotateCcw,
  Shield,
  Star,
  Flame,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useShopCurrency } from "~/hooks/use-tenant-settings";
import { ProductDetailModal } from "../parts/product-detail-modal";
import { ProductSkeletonGrid } from "../parts/product-skeleton";
import { StorefrontImage } from "../storefront-image";

type Products = RouterOutputs["shop"]["getProducts"]["items"];
type Product = Products[number];

// Trust badge component
function TrustBadge({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Truck;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary-100)] text-[var(--brand-primary-600)] dark:bg-[var(--brand-primary-900)]/30 dark:text-[var(--brand-primary-400)]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>
    </div>
  );
}

// Sale badge component
function SaleBadge({ percentage }: { percentage: number }) {
  return (
    <div className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
      <Flame className="h-3 w-3" />-{percentage}%
    </div>
  );
}

// Stock indicator component
function StockIndicator({ quantity }: { quantity: number | null }) {
  if (quantity === null || quantity === -1) return null;

  if (quantity === 0) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
        <AlertCircle className="h-3 w-3" />
        Out of Stock
      </div>
    );
  }

  if (quantity <= 5) {
    return (
      <div className="flex animate-pulse items-center gap-1.5 rounded-full bg-orange-50 px-2 py-1 text-xs font-medium text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
        <Clock className="h-3 w-3" />
        Only {quantity} left!
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-600 dark:bg-green-900/30 dark:text-green-400">
      <div className="h-2 w-2 rounded-full bg-green-500" />
      In Stock
    </div>
  );
}

// Product card for conversion template
function ConversionProductCard({
  product,
  onQuickView,
  priority = false,
}: {
  product: Product;
  onQuickView: () => void;
  priority?: boolean;
}) {
  const { addItem } = useCart();
  const { formatCurrency } = useShopCurrency();
  const price = Number(product.price);
  const salePrice = product.salePrice ? Number(product.salePrice) : null;
  const displayPrice = salePrice ?? price;
  const salePercentage = salePrice
    ? Math.round(((price - salePrice) / price) * 100)
    : 0;
  const isOutOfStock = product.stockQuantity === 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-gray-200 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:shadow-black/30">
      {salePercentage > 0 && <SaleBadge percentage={salePercentage} />}

      <button
        type="button"
        aria-label={`Quick view ${product.name}`}
        className="relative aspect-square w-full cursor-pointer overflow-hidden bg-gray-50 dark:bg-gray-900"
        onClick={onQuickView}
      >
        {product.image ? (
          <StorefrontImage
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-gray-500">
            No Image
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-100 transition-opacity duration-300">
          <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 dark:bg-gray-800 dark:text-white">
            Quick View
          </span>
        </div>
      </button>

      <div className="flex flex-1 flex-col p-4">
        {product.category && (
          <span className="mb-1.5 text-xs font-medium tracking-wide text-[var(--brand-primary-600)] uppercase dark:text-[var(--brand-primary-400)]">
            {product.category.name}
          </span>
        )}

        {/* Real permalink so the product page has an indexable inbound link. */}
        <h3 className="mb-2 line-clamp-2 text-base font-semibold text-gray-900 dark:text-white">
          <Link
            href={productPath(product)}
            className="cursor-pointer transition-colors hover:text-[var(--brand-primary-600)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] focus-visible:outline-none dark:hover:text-[var(--brand-primary-400)]"
          >
            {product.name}
          </Link>
        </h3>

        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(displayPrice)}
          </span>
          {salePrice && (
            <span className="text-sm text-gray-400 line-through dark:text-gray-500">
              {formatCurrency(price)}
            </span>
          )}
        </div>

        <div className="mb-4">
          <StockIndicator quantity={product.stockQuantity} />
        </div>

        <button
          onClick={() => {
            if (!isOutOfStock) {
              addItem({
                productId: product.id,
                name: product.name,
                price: displayPrice,
                image: product.image,
                stockQuantity: product.stockQuantity,
              });
            }
          }}
          disabled={isOutOfStock}
          className={`mt-auto flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold tracking-wide uppercase transition-all duration-300 ${
            isOutOfStock
              ? "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
              : "bg-[var(--brand-primary-600)] text-white hover:bg-[var(--brand-primary-700)] hover:shadow-[var(--brand-primary-500)]/25 hover:shadow-lg active:scale-[0.98]"
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          {isOutOfStock ? "Out of Stock" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}

export function ConversionTemplate(props: StoreTemplateProps) {
  const {
    shopDetails,
    products,
    categories,
    isLoading,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    onClearFilters,
    config,
  } = props;
  const tenant = shopDetails?.tenant;
  const { totalItems, totalAmount, setIsCartOpen } = useCart();
  const { formatCurrency } = useShopCurrency();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <div className="min-h-screen bg-[#faf9f7] font-sans text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* Navbar */}
      <ShopNavbar
        tenant={tenant}
        search={search}
        setSearch={setSearch}
        className="!border-b !border-gray-200 !bg-white !backdrop-blur-none dark:!border-gray-700 dark:!bg-gray-800 [&_*]:!text-gray-900 dark:[&_*]:!text-gray-100 [&_input]:!border-gray-200 [&_input]:!bg-gray-50 [&_input]:!text-gray-900 dark:[&_input]:!border-gray-600 dark:[&_input]:!bg-gray-700 dark:[&_input]:!text-white [&_input::placeholder]:!text-gray-400"
      />

      {/* Urgency Banner */}
      <div className="relative mt-32 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 py-3 text-center shadow-lg md:mt-20">
        <div className="container mx-auto flex items-center justify-center gap-3 px-4">
          <Flame className="h-5 w-5 animate-pulse text-yellow-300" />
          <span className="text-sm font-bold tracking-wider text-white">
            {(config.heroTitle === "" ? undefined : config.heroTitle) ??
              "BROWSE PRODUCTS — CHECK CURRENT PRICES AND STOCK"}
          </span>
          <Flame className="h-5 w-5 animate-pulse text-yellow-300" />
        </div>
      </div>

      {/* Hero Section */}
      {config.showHero && (
        <section className="relative overflow-hidden pt-10 pb-12">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5 dark:opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
                backgroundSize: "40px 40px",
              }}
            />
          </div>

          <div className="relative container mx-auto px-4 text-center">
            <h1 className="mb-4 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl lg:text-6xl dark:text-white">
              {(config.heroTitle === "" ? undefined : config.heroTitle) ?? (
                <>
                  Shop{" "}
                  <span className="bg-gradient-to-r from-[var(--brand-primary-500)] to-[var(--brand-primary-700)] bg-clip-text text-transparent">
                    Smart
                  </span>
                  , Save{" "}
                  <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                    Big
                  </span>
                </>
              )}
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              {(config.heroDescription === ""
                ? undefined
                : config.heroDescription) ??
                "Find what you need, compare prices, and check availability before ordering."}
            </p>
            <button
              onClick={() =>
                document
                  .getElementById("conversion-products")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-primary-600)] px-8 py-4 font-bold text-white shadow-[var(--brand-primary-500)]/25 shadow-xl transition-all duration-300 hover:scale-105 hover:bg-[var(--brand-primary-700)] hover:shadow-[var(--brand-primary-500)]/40"
            >
              Shop Now
              <ChevronDown className="h-5 w-5 animate-bounce" />
            </button>
          </div>
        </section>
      )}

      {/* Trust Badges */}
      <section
        className={`border-y border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800`}
      >
        <div className="container mx-auto">
          <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-gray-700">
            <TrustBadge
              icon={Truck}
              title="Fulfilment options"
              subtitle="Available options shown at checkout"
            />
            <TrustBadge
              icon={RotateCcw}
              title="Store support"
              subtitle="Contact the store for product advice"
            />
            <TrustBadge
              icon={Shield}
              title="Secure Checkout"
              subtitle="Review your items before ordering"
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main id="conversion-products" className="container mx-auto px-4 py-8">
        {/* Filter Bar */}
        <div className="mb-6 flex flex-col gap-4">
          {/* Category Pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                selectedCategory === undefined
                  ? "bg-[var(--brand-primary-600)] text-white shadow-md"
                  : "border border-gray-200 bg-white text-gray-700 hover:border-[var(--brand-primary-300)] hover:text-[var(--brand-primary-600)] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-[var(--brand-primary-500)] dark:hover:text-[var(--brand-primary-400)]"
              }`}
            >
              All Products
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  selectedCategory === cat.id
                    ? "bg-[var(--brand-primary-600)] text-white shadow-md"
                    : "border border-gray-200 bg-white text-gray-700 hover:border-[var(--brand-primary-300)] hover:text-[var(--brand-primary-600)] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-[var(--brand-primary-500)] dark:hover:text-[var(--brand-primary-400)]"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <TemplateBrowseControls {...props}>
          {isLoading ? (
            <ProductSkeletonGrid count={9} columns={3} />
          ) : products && products.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, index) => (
                <ConversionProductCard
                  key={product.id}
                  product={product}
                  onQuickView={() => setSelectedProduct(product)}
                  priority={index < 3}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-96 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white text-center dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                <ShoppingCart className="h-10 w-10 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                No products found
              </h3>
              <p className="mb-4 text-gray-500 dark:text-gray-400">
                Try adjusting your filters or search terms
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedCategory(undefined);
                  onClearFilters();
                }}
                className="rounded-full bg-[var(--brand-primary-600)] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-primary-700)]"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </TemplateBrowseControls>
      </main>

      {/* Trust Footer */}
      <section className="border-t border-gray-200 bg-white py-8 dark:border-gray-700 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 text-gray-400 dark:text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">SSL Secured</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              <span className="text-sm font-medium">Fast Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              <span className="text-sm font-medium">Easy Returns</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              <span className="text-sm font-medium">Top Rated</span>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Mobile Cart Bar */}
      {totalItems > 0 && (
        <div className="safe-area-inset-bottom fixed right-0 bottom-0 left-0 z-50 border-t border-gray-200 bg-white shadow-2xl lg:hidden dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Cart ({totalItems} items)
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
              <button
                onClick={() => setIsCartOpen(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary-600)] py-3.5 font-bold text-white shadow-lg transition-colors hover:bg-[var(--brand-primary-700)]"
              >
                <ShoppingCart className="h-5 w-5" />
                View Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
