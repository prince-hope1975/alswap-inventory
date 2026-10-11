"use client";

import type { StoreTemplateProps } from "./modern-template";
import { TemplateBrowseControls } from "../parts/template-browse-controls";

import { useState } from "react";
import type { RouterOutputs } from "~/trpc/react";
import { ShopNavbar } from "../parts/shop-navbar";
import { useCart } from "../cart-context";
import { ArrowRight } from "lucide-react";
import { useShopCurrency } from "~/hooks/use-tenant-settings";
import { ProductDetailModal } from "../parts/product-detail-modal";
import { ProductSkeletonGrid } from "../parts/product-skeleton";
import { StockBadge } from "../parts/stock-badge";
import { StorefrontImage } from "../storefront-image";

type Products = RouterOutputs["shop"]["getProducts"]["items"];
type Product = Products[number];

export function MinimalTemplate(props: StoreTemplateProps) {
  const {
    shopDetails,
    products,
    categories,
    isLoading,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    config,
  } = props;
  const tenant = shopDetails?.tenant;
  const { addItem } = useCart();
  const { formatCurrency } = useShopCurrency();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900 selection:bg-[var(--brand-primary-200)] selection:text-[var(--brand-primary-900)] dark:bg-zinc-950 dark:text-zinc-100">
      <ShopNavbar
        tenant={tenant}
        search={search}
        setSearch={setSearch}
        className="!border-b !border-zinc-100 !bg-white/80 dark:!border-zinc-900 dark:!bg-zinc-950/80"
      />

      <main className="container mx-auto max-w-7xl px-6 pt-32 pb-24">
        {config.showHero && (
          <div className="animate-in fade-in slide-in-from-bottom-8 mx-auto mb-32 max-w-4xl text-center duration-700">
            <span className="mb-8 block text-xs font-bold tracking-[0.3em] text-[var(--brand-primary-600)] uppercase">
              Electrical essentials
            </span>
            <h1 className="mb-10 text-6xl leading-[1.1] font-light tracking-tight md:text-8xl">
              {(config.heroTitle === "" ? undefined : config.heroTitle) ?? (
                <>
                  Reliable equipment for{" "}
                  <span className="font-serif text-[var(--brand-primary-600)] italic">
                    real
                  </span>{" "}
                  work.
                </>
              )}
            </h1>
            <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed font-light text-zinc-500">
              {(config.heroDescription === ""
                ? undefined
                : config.heroDescription) ??
                "Cables, lighting, tools, power equipment and accessories selected for homes, businesses and project sites."}
            </p>
            <button
              onClick={() =>
                document
                  .getElementById("shop")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="group inline-flex items-center gap-3 border-b-2 border-zinc-900 pb-2 text-sm font-medium tracking-wide transition-colors hover:border-[var(--brand-primary-600)] hover:text-[var(--brand-primary-600)] dark:border-white"
            >
              Browse products{" "}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        )}

        <div
          id="shop"
          className="mb-12 flex flex-wrap justify-center gap-10 text-sm tracking-wider uppercase"
        >
          <button
            onClick={() => setSelectedCategory(undefined)}
            className={`transition-all ${selectedCategory === undefined ? "border-b-2 border-[var(--brand-primary-600)] pb-1 font-semibold text-[var(--brand-primary-600)]" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"}`}
          >
            All
          </button>
          {categories?.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`transition-all ${selectedCategory === c.id ? "border-b-2 border-[var(--brand-primary-600)] pb-1 font-semibold text-[var(--brand-primary-600)]" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <TemplateBrowseControls {...props}>
          {isLoading ? (
            <ProductSkeletonGrid count={6} columns={3} />
          ) : (
            <div className="grid grid-cols-1 gap-x-16 gap-y-24 md:grid-cols-2 lg:grid-cols-3">
              {products?.map((product, index) => (
                <div key={product.id} className="group cursor-pointer">
                  <div className="relative mb-8 aspect-[3/4] overflow-hidden bg-zinc-50 dark:bg-zinc-900">
                    {product.image ? (
                      <StorefrontImage
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) calc(100vw - 2rem), 50vw"
                        priority={index < 2}
                        className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-zinc-300">
                        No Image
                      </div>
                    )}
                    <button
                      type="button"
                      aria-label={`Quick view ${product.name}`}
                      onClick={() => setSelectedProduct(product)}
                      className="absolute inset-0 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] focus-visible:ring-inset"
                    />
                    <StockBadge
                      stockQuantity={product.stockQuantity}
                      className="pointer-events-none absolute top-6 left-6"
                    />

                    <button
                      aria-label={`Add ${product.name} to cart`}
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem({
                          productId: product.id,
                          name: product.name,
                          price: Number(product.salePrice ?? product.price),
                          image: product.image,
                          stockQuantity: product.stockQuantity,
                        });
                      }}
                      disabled={product.stockQuantity === 0}
                      className="absolute right-8 bottom-8 flex h-14 w-14 translate-y-0 items-center justify-center rounded-full border border-zinc-100 bg-white opacity-100 shadow-2xl transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100 hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-white dark:hover:text-black"
                    >
                      <span className="text-2xl font-light">+</span>
                    </button>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="mb-2 text-xl font-light text-zinc-900 transition-colors group-hover:text-[var(--brand-primary-600)] dark:text-zinc-100">
                        {product.name}
                      </h3>
                      <p className="text-sm tracking-wide text-zinc-500 uppercase">
                        {(product.category?.name === ""
                          ? undefined
                          : product.category?.name) ?? "Item"}
                      </p>
                    </div>
                    <div className="text-right">
                      {product.salePrice ? (
                        <>
                          <div className="text-xl font-medium text-red-600 dark:text-red-400">
                            {formatCurrency(Number(product.salePrice))}
                          </div>
                          <div className="text-sm text-zinc-400 line-through">
                            {formatCurrency(Number(product.price))}
                          </div>
                        </>
                      ) : (
                        <span className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(product.price)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TemplateBrowseControls>
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
