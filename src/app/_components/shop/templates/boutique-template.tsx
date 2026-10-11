"use client";

import type { StoreTemplateProps } from "./modern-template";
import { TemplateBrowseControls } from "../parts/template-browse-controls";

import { useState } from "react";
import type { RouterOutputs } from "~/trpc/react";
import { ShopNavbar } from "../parts/shop-navbar";
import { useCart } from "../cart-context";
import { useShopCurrency } from "~/hooks/use-tenant-settings";
import { ProductDetailModal } from "../parts/product-detail-modal";
import { ProductSkeletonGrid } from "../parts/product-skeleton";
import { StockBadge } from "../parts/stock-badge";
import { StorefrontImage } from "../storefront-image";

type Products = RouterOutputs["shop"]["getProducts"]["items"];
type Product = Products[number];

export function BoutiqueTemplate(props: StoreTemplateProps) {
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
    <div className="min-h-screen bg-[#fcfbf9] font-serif text-zinc-800 selection:bg-[var(--brand-primary-100)] selection:text-[var(--brand-primary-900)] dark:bg-[#121212] dark:text-zinc-200">
      <ShopNavbar
        tenant={tenant}
        search={search}
        setSearch={setSearch}
        className="sticky top-0 !border-b !border-stone-200 !bg-[#fcfbf9]/95 dark:!border-stone-800 dark:!bg-[#121212]/95"
        showSearch={true}
      />

      {config.showHero && (
        <div className="flex h-[75vh] w-full flex-col overflow-hidden md:flex-row">
          <div className="relative flex w-full flex-col justify-center overflow-hidden bg-[var(--brand-primary-900)] p-12 text-white md:w-1/2 md:p-24">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat opacity-10" />
            <span className="relative z-10 mb-6 text-xs tracking-[0.4em] uppercase opacity-80">
              Collection 01
            </span>
            <h1 className="relative z-10 mb-8 font-serif text-5xl leading-tight italic md:text-7xl">
              {(config.heroTitle === "" ? undefined : config.heroTitle) ?? (
                <span
                  dangerouslySetInnerHTML={{
                    __html: "Timeless <br/> Elegance",
                  }}
                />
              )}
            </h1>
            <p className="relative z-10 mb-10 max-w-sm font-sans text-lg leading-relaxed opacity-80">
              {(config.heroDescription === ""
                ? undefined
                : config.heroDescription) ??
                "Discover pieces that speak a language of their own. Handpicked for the discerning taste."}
            </p>
            <button
              onClick={() =>
                document
                  .getElementById("boutique-products")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="relative z-10 w-fit border-2 border-white/40 px-10 py-4 font-sans text-sm tracking-[0.25em] uppercase transition-all duration-500 hover:bg-white hover:text-[var(--brand-primary-900)]"
            >
              Shop The Look
            </button>
          </div>
          <div className="relative w-full bg-stone-200 md:w-1/2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=2070"
              className="absolute inset-0 h-full w-full object-cover"
              alt="Boutique Hero"
            />
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-20 md:px-8">
        <div className="mb-16 flex flex-wrap justify-center gap-4 font-sans text-sm">
          <button
            onClick={() => setSelectedCategory(undefined)}
            className={`rounded-full border-2 px-8 py-3 transition-all duration-300 ${selectedCategory === undefined ? "border-[var(--brand-primary-900)] bg-[var(--brand-primary-900)] text-white shadow-lg" : "border-stone-300 hover:border-[var(--brand-primary-400)] dark:border-zinc-700"}`}
          >
            All Items
          </button>
          {categories?.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`rounded-full border-2 px-8 py-3 transition-all duration-300 ${selectedCategory === c.id ? "border-[var(--brand-primary-900)] bg-[var(--brand-primary-900)] text-white shadow-lg" : "border-stone-300 hover:border-[var(--brand-primary-400)] dark:border-zinc-700"}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <TemplateBrowseControls {...props}>
          {isLoading ? (
            <ProductSkeletonGrid count={8} columns={4} />
          ) : (
            <div
              id="boutique-products"
              className="columns-1 gap-8 space-y-8 font-sans md:columns-2 lg:columns-3 xl:columns-4"
            >
              {products?.map((product, index) => (
                <div
                  key={product.id}
                  className="group cursor-pointer break-inside-avoid border border-stone-100 bg-white p-5 shadow-sm transition-all duration-500 hover:shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="relative mb-5 aspect-[4/5] overflow-hidden bg-stone-50 dark:bg-zinc-800">
                    {product.image && (
                      <StorefrontImage
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) calc(100vw - 2rem), (max-width: 1280px) 50vw, 33vw"
                        priority={index < 3}
                        className="object-cover transition-transform duration-1000 group-hover:scale-110"
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
                      className="pointer-events-none absolute top-4 left-4"
                    />

                    <div className="absolute inset-x-0 bottom-0 flex translate-y-0 justify-center bg-gradient-to-t from-black/70 to-transparent p-5 transition-transform duration-500">
                      <button
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
                        className="border-2 border-black bg-white px-10 py-4 font-serif text-xs tracking-[0.3em] text-black uppercase shadow-xl transition-all duration-300 hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-black dark:text-white dark:hover:bg-white dark:hover:text-black"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="mb-2 font-serif text-xl transition-colors group-hover:text-[var(--brand-primary-700)]">
                      {product.name}
                    </h3>
                    {product.salePrice ? (
                      <div className="flex items-center justify-center gap-3">
                        <p className="text-base font-medium text-red-600 dark:text-red-400">
                          {formatCurrency(Number(product.salePrice))}
                        </p>
                        <p className="text-sm text-zinc-400 line-through">
                          {formatCurrency(Number(product.price))}
                        </p>
                      </div>
                    ) : (
                      <p className="text-base font-medium text-[var(--brand-primary-600)]">
                        {formatCurrency(product.price)}
                      </p>
                    )}
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
