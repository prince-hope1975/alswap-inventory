"use client";

import { type RouterOutputs } from "~/trpc/react";
import { ProductCard } from "../product-card";
import { ShopNavbar } from "../parts/shop-navbar";
import { useCart } from "../cart-context";
import type { StoreConfig } from "~/types/store-config";
import { ArrowRight } from "lucide-react";

type ShopDetails = RouterOutputs["shop"]["getShopDetails"];
type Products = RouterOutputs["shop"]["getProducts"];
type Categories = RouterOutputs["shop"]["getCategories"];

interface MinimalTemplateProps {
    shopDetails: ShopDetails | undefined;
    products: Products | undefined;
    categories: Categories | undefined;
    isLoading: boolean;
    search: string;
    setSearch: (value: string) => void;
    selectedCategory: number | undefined;
    setSelectedCategory: (id: number | undefined) => void;
    config: StoreConfig;
}

export function MinimalTemplate({
    shopDetails,
    products,
    categories,
    isLoading,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    config,
}: MinimalTemplateProps) {
    const tenant = shopDetails?.tenant;
    const { addItem } = useCart();

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-[var(--brand-primary-200)] selection:text-[var(--brand-primary-900)]">
            {/* Minimal Navbar - Clean, centered or simple */}
            <ShopNavbar
                tenant={tenant}
                search={search}
                setSearch={setSearch}
                className="!bg-white/80 dark:!bg-zinc-950/80 !border-b !border-zinc-100 dark:!border-zinc-900"
            />

            <main className="container mx-auto px-6 pt-32 pb-24 max-w-7xl">

                {/* Minimal Hero - Just big text */}
                {config.showHero && (
                    <div className="mb-24 text-center max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <span className="text-xs font-bold tracking-[0.2em] uppercase text-[var(--brand-primary-600)] mb-6 block">
                            New Collection 2024
                        </span>
                        <h1 className="text-5xl md:text-7xl font-light tracking-tight mb-8">
                            {config.heroTitle || <>Essentials for <span className="font-serif italic text-[var(--brand-primary-600)]">modern</span> living.</>}
                        </h1>
                        <p className="text-lg text-zinc-500 font-light mb-10 max-w-xl mx-auto leading-relaxed">
                            {config.heroDescription || "Curated items for your everyday life. Simple, functional, and beautiful objects that spark joy."}
                        </p>
                        <button
                            onClick={() => document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })}
                            className="group inline-flex items-center gap-2 border-b border-zinc-900 dark:border-white pb-1 text-sm font-medium tracking-wide hover:text-[var(--brand-primary-600)] hover:border-[var(--brand-primary-600)] transition-colors"
                        >
                            Explore Collection <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </button>
                    </div>
                )}

                {/* Category Filters - Text only */}
                <div id="shop" className="flex flex-wrap justify-center gap-8 mb-16 text-sm tracking-wide">
                    <button
                        onClick={() => setSelectedCategory(undefined)}
                        className={`transition-colors ${selectedCategory === undefined ? 'text-[var(--brand-primary-600)] font-medium' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
                    >
                        All
                    </button>
                    {categories?.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedCategory(c.id)}
                            className={`transition-colors ${selectedCategory === c.id ? 'text-[var(--brand-primary-600)] font-medium' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>

                {/* Products Grid - Sparse */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-20">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="space-y-4">
                                <div className="aspect-[3/4] bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
                                <div className="h-4 w-2/3 bg-zinc-100 dark:bg-zinc-900" />
                                <div className="h-4 w-1/4 bg-zinc-100 dark:bg-zinc-900" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-20">
                        {products?.map((product) => (
                            <div key={product.id} className="group cursor-pointer">
                                <div className="relative aspect-[3/4] mb-6 overflow-hidden bg-zinc-50 dark:bg-zinc-900">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    {product.image ? (
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-zinc-300">No Image</div>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors absolute-cover" />

                                    {/* Minimal Quick Add */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            addItem({
                                                productId: product.id,
                                                name: product.name,
                                                price: Number(product.price),
                                                image: product.image
                                            });
                                        }}
                                        className="absolute bottom-6 right-6 h-12 w-12 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 shadow-xl translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border border-zinc-100 dark:border-zinc-700"
                                    >
                                        <span className="text-xl font-light">+</span>
                                    </button>
                                </div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-light text-zinc-900 dark:text-zinc-100 group-hover:text-[var(--brand-primary-600)] transition-colors">
                                            {product.name}
                                        </h3>
                                        <p className="text-sm text-zinc-500 mt-1">{product.category?.name || 'Item'}</p>
                                    </div>
                                    <span className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                                        ₦{Number(product.price).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
