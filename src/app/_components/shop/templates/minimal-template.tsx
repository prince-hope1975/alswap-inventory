"use client";

import { useState } from "react";
import { type RouterOutputs } from "~/trpc/react";
import { ProductCard } from "../product-card";
import { ShopNavbar } from "../parts/shop-navbar";
import { useCart } from "../cart-context";
import type { StoreConfig } from "~/types/store-config";
import { ArrowRight, Filter } from "lucide-react";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { ProductDetailModal } from "../parts/product-detail-modal";
import { ShopFilters, type SortOption } from "../parts/shop-filters";
import { ProductSkeletonGrid } from "../parts/product-skeleton";
import { StockBadge } from "../parts/stock-badge";

type ShopDetails = RouterOutputs["shop"]["getShopDetails"];
type Products = RouterOutputs["shop"]["getProducts"];
type Categories = RouterOutputs["shop"]["getCategories"];
type Product = Products[number];

interface MinimalTemplateProps {
    shopDetails: ShopDetails | undefined;
    products: Products | undefined;
    categories: Categories | undefined;
    isLoading: boolean;
    search: string;
    setSearch: (value: string) => void;
    selectedCategory: number | undefined;
    setSelectedCategory: (id: number | undefined) => void;
    sortBy: SortOption;
    setSortBy: (value: SortOption) => void;
    priceRange: [number, number];
    setPriceRange: (value: [number, number]) => void;
    inStockOnly: boolean;
    setInStockOnly: (value: boolean) => void;
    onClearFilters: () => void;
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
    sortBy,
    setSortBy,
    priceRange,
    setPriceRange,
    inStockOnly,
    setInStockOnly,
    onClearFilters,
    config,
}: MinimalTemplateProps) {
    const tenant = shopDetails?.tenant;
    const { addItem } = useCart();
    const { formatCurrency } = useCurrency();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-[var(--brand-primary-200)] selection:text-[var(--brand-primary-900)]">
            <ShopNavbar
                tenant={tenant}
                search={search}
                setSearch={setSearch}
                className="!bg-white/80 dark:!bg-zinc-950/80 !border-b !border-zinc-100 dark:!border-zinc-900"
            />

            <main className="container mx-auto px-6 pt-32 pb-24 max-w-7xl">

                {config.showHero && (
                    <div className="mb-32 text-center max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <span className="text-xs font-bold tracking-[0.3em] uppercase text-[var(--brand-primary-600)] mb-8 block">
                            New Collection 2024
                        </span>
                        <h1 className="text-6xl md:text-8xl font-light tracking-tight mb-10 leading-[1.1]">
                            {config.heroTitle || <>Essentials for <span className="font-serif italic text-[var(--brand-primary-600)]">modern</span> living.</>}
                        </h1>
                        <p className="text-xl text-zinc-500 font-light mb-12 max-w-2xl mx-auto leading-relaxed">
                            {config.heroDescription || "Curated items for your everyday life. Simple, functional, and beautiful objects that spark joy."}
                        </p>
                        <button
                            onClick={() => document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })}
                            className="group inline-flex items-center gap-3 border-b-2 border-zinc-900 dark:border-white pb-2 text-sm font-medium tracking-wide hover:text-[var(--brand-primary-600)] hover:border-[var(--brand-primary-600)] transition-colors"
                        >
                            Explore Collection <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </button>
                    </div>
                )}

                <div id="shop" className="flex flex-wrap justify-center gap-10 mb-12 text-sm tracking-wider uppercase">
                    <button
                        onClick={() => setSelectedCategory(undefined)}
                        className={`transition-all ${selectedCategory === undefined ? 'text-[var(--brand-primary-600)] font-semibold border-b-2 border-[var(--brand-primary-600)] pb-1' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
                    >
                        All
                    </button>
                    {categories?.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedCategory(c.id)}
                            className={`transition-all ${selectedCategory === c.id ? 'text-[var(--brand-primary-600)] font-semibold border-b-2 border-[var(--brand-primary-600)] pb-1' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>

                <div className="mb-16 flex justify-center">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                    >
                        <Filter className="h-4 w-4" />
                        {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </button>
                </div>

                {showFilters && (
                    <div className="mb-16 max-w-4xl mx-auto animate-in fade-in slide-in-from-top-4 duration-300">
                        <ShopFilters
                            sortBy={sortBy}
                            setSortBy={setSortBy}
                            priceRange={priceRange}
                            setPriceRange={setPriceRange}
                            inStockOnly={inStockOnly}
                            setInStockOnly={setInStockOnly}
                            onClearFilters={onClearFilters}
                        />
                    </div>
                )}

                {isLoading ? (
                    <ProductSkeletonGrid count={6} columns={3} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-24">
                        {products?.map((product) => (
                            <div 
                                key={product.id} 
                                className="group cursor-pointer"
                                onClick={() => setSelectedProduct(product)}
                            >
                                <div className="relative aspect-[3/4] mb-8 overflow-hidden bg-zinc-50 dark:bg-zinc-900">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    {product.image ? (
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-zinc-300">No Image</div>
                                    )}
                                    <StockBadge stockQuantity={product.stockQuantity} className="absolute top-6 left-6" />

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            addItem({
                                                productId: product.id,
                                                name: product.name,
                                                price: Number(product.salePrice || product.price),
                                                image: product.image
                                            });
                                        }}
                                        disabled={product.stockQuantity === 0}
                                        className="absolute bottom-8 right-8 h-14 w-14 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 shadow-2xl translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border border-zinc-100 dark:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="text-2xl font-light">+</span>
                                    </button>
                                </div>
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-light text-zinc-900 dark:text-zinc-100 group-hover:text-[var(--brand-primary-600)] transition-colors mb-2">
                                            {product.name}
                                        </h3>
                                        <p className="text-sm text-zinc-500 uppercase tracking-wide">{product.category?.name || 'Item'}</p>
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
