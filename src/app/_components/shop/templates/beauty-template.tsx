"use client";

import { useState, type ComponentProps } from "react";
import { ArrowUpRight, Leaf, Sparkles } from "lucide-react";

import { useCurrency } from "~/hooks/use-tenant-settings";
import { useCart } from "../cart-context";
import { ProductDetailModal } from "../parts/product-detail-modal";
import { ShopNavbar } from "../parts/shop-navbar";
import { type MinimalTemplate } from "./minimal-template";

type BeautyProps = ComponentProps<typeof MinimalTemplate>;
type BeautyProduct = NonNullable<BeautyProps["products"]>[number];

export function BeautyTemplate({ shopDetails, products, categories, isLoading, search, setSearch, selectedCategory, setSelectedCategory, config }: BeautyProps) {
  const tenant = shopDetails?.tenant;
  const { addItem } = useCart();
  const { formatCurrency } = useCurrency();
  const [selectedProduct, setSelectedProduct] = useState<BeautyProduct | null>(null);

  return (
    <div className="min-h-screen bg-[#f4eee8] text-[#28201c] selection:bg-[#b8c7a3]">
      <ShopNavbar tenant={tenant} search={search} setSearch={setSearch} className="!border-[#d9cec5] !bg-[#f4eee8]/90 !text-[#28201c]" />
      <main>
        {config.showHero && (
          <section className="relative overflow-hidden px-5 pb-24 pt-36 sm:px-8 lg:pb-32">
            <div aria-hidden="true" className="absolute -right-32 top-20 h-96 w-96 rounded-full bg-[#b8c7a3]/50 blur-3xl" />
            <div className="relative mx-auto grid max-w-7xl items-end gap-12 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-[#667252]"><Leaf className="h-4 w-4" /> Rituals, honestly formulated</p>
                <h1 className="mt-7 max-w-4xl font-serif text-6xl leading-[0.88] tracking-[-0.055em] sm:text-8xl lg:text-[7.5rem]">
                  {config.heroTitle || "Care that meets your skin where it is."}
                </h1>
                <p className="mt-8 max-w-xl text-lg leading-8 text-[#75675e]">{config.heroDescription || "Ingredient-led essentials, considered routines and clear guidance—without impossible promises."}</p>
              </div>
              <div className="relative aspect-[4/5] overflow-hidden rounded-[48%_48%_8%_8%] bg-[#c8b5a6] p-8">
                <div className="grid h-full place-items-center rounded-[48%_48%_8%_8%] border border-white/60 bg-[radial-gradient(circle_at_50%_30%,#f9f3ed,transparent_45%)]">
                  <Sparkles className="h-16 w-16 text-white" strokeWidth={1} />
                </div>
              </div>
            </div>
          </section>
        )}

        <section id="shop" aria-labelledby="beauty-shop-title" className="bg-[#fffaf5] px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[0.24em] text-[#7c8c65]">Shop by ritual</p><h2 id="beauty-shop-title" className="mt-3 font-serif text-5xl tracking-tight">Everyday essentials</h2></div>
              <div className="flex flex-wrap gap-2" aria-label="Product categories">
                <button onClick={() => setSelectedCategory(undefined)} className={`min-h-11 rounded-full border px-5 text-sm font-bold ${selectedCategory === undefined ? "border-[#28201c] bg-[#28201c] text-white" : "border-[#d9cec5]"}`}>All</button>
                {categories?.map((category) => <button key={category.id} onClick={() => setSelectedCategory(category.id)} className={`min-h-11 rounded-full border px-5 text-sm font-bold ${selectedCategory === category.id ? "border-[#28201c] bg-[#28201c] text-white" : "border-[#d9cec5]"}`}>{category.name}</button>)}
              </div>
            </div>

            {isLoading ? <p className="py-20 text-center text-[#75675e]">Preparing collection…</p> : (
              <div className="mt-14 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {products?.map((product, index) => {
                  const price = Number(product.salePrice ?? product.price);
                  return <article key={product.id} className={index % 5 === 1 ? "lg:translate-y-12" : ""}>
                    <button onClick={() => setSelectedProduct(product)} className="group block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#667252]">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-[45%_45%_5%_5%] bg-[#eee3d9]">{product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="grid h-full place-items-center font-serif text-2xl text-[#a18d80]">{product.name}</div>}<span className="absolute right-4 top-4 rounded-full bg-[#fffaf5]/90 px-3 py-1 text-xs font-bold">{product.stockQuantity === 0 ? "Join waitlist" : "In stock"}</span></div>
                      <div className="mt-5 flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#7c8c65]">{product.category?.name ?? "Daily care"}</p><h3 className="mt-1 font-serif text-2xl">{product.name}</h3></div><ArrowUpRight className="mt-2 h-5 w-5" /></div>
                    </button>
                    <div className="mt-4 flex items-center justify-between"><span className="font-bold">{formatCurrency(price)}</span><button disabled={product.stockQuantity === 0} onClick={() => addItem({ productId: product.id, name: product.name, price, image: product.image })} className="min-h-11 rounded-full bg-[#28201c] px-5 text-sm font-bold text-white disabled:opacity-40">Add to ritual</button></div>
                  </article>;
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
    </div>
  );
}
