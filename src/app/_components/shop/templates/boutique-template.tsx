"use client";

import { useState } from "react";
import { type RouterOutputs } from "~/trpc/react";
import { ProductCard } from "../product-card";
import { ShopNavbar } from "../parts/shop-navbar";
import { useCart } from "../cart-context";
import type { StoreConfig } from "~/types/store-config";
import { Filter, Sparkles, Heart } from "lucide-react";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { ProductDetailModal } from "../parts/product-detail-modal";
import { ShopFilters, type SortOption } from "../parts/shop-filters";
import { ProductSkeletonGrid } from "../parts/product-skeleton";
import { StockBadge } from "../parts/stock-badge";

type ShopDetails = RouterOutputs["shop"]["getShopDetails"];
type Products = RouterOutputs["shop"]["getProducts"];
type Categories = RouterOutputs["shop"]["getCategories"];
type Product = Products[number];

interface BoutiqueTemplateProps {
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

export function BoutiqueTemplate({
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
}: BoutiqueTemplateProps) {
    const tenant = shopDetails?.tenant;
    const { addItem } = useCart();
    const { formatCurrency } = useCurrency();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    return (
        <div className="min-h-screen bg-[#fcfbf9] dark:bg-[#121212] text-zinc-800 dark:text-zinc-200 font-serif selection:bg-[var(--brand-primary-100)] selection:text-[var(--brand-primary-900)]">
            <ShopNavbar
                tenant={tenant}
                search={search}
                setSearch={setSearch}
                className="!bg-[#fcfbf9]/95 dark:!bg-[#121212]/95 !border-b !border-stone-200 dark:!border-stone-800 sticky top-0"
                showSearch={false}
            />

            {config.showHero && (
                <div className="flex flex-col md:flex-row h-[75vh] w-full overflow-hidden">
                    <div className="w-full md:w-1/2 bg-[var(--brand-primary-900)] text-white flex flex-col justify-center p-12 md:p-24 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat" />
                        <span className="relative z-10 text-xs tracking-[0.4em] uppercase mb-6 opacity-80">Collection 01</span>
                        <h1 className="relative z-10 text-5xl md:text-7xl font-serif italic mb-8 leading-tight">
                            {config.heroTitle || <span dangerouslySetInnerHTML={{ __html: "Timeless <br/> Elegance" }} />}
                        </h1>
                        <p className="relative z-10 text-lg opacity-80 font-sans max-w-sm leading-relaxed mb-10">
                            {config.heroDescription || "Discover pieces that speak a language of their own. Handpicked for the discerning taste."}
                        </p>
                        <button 
                            onClick={() => document.getElementById('boutique-products')?.scrollIntoView({ behavior: 'smooth' })}
                            className="relative z-10 w-fit border-2 border-white/40 hover:bg-white hover:text-[var(--brand-primary-900)] px-10 py-4 transition-all duration-500 font-sans text-sm tracking-[0.25em] uppercase"
                        >
                            Shop The Look
                        </button>
                    </div>
                    <div className="w-full md:w-1/2 relative bg-stone-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=2070"
                            className="absolute inset-0 w-full h-full object-cover"
                            alt="Boutique Hero"
                        />
                    </div>
                </div>
            )}

            <main className="container mx-auto px-4 md:px-8 py-20">

                <div className="flex flex-wrap justify-center gap-4 mb-16 font-sans text-sm">
                    <button
                        onClick={() => setSelectedCategory(undefined)}
                        className={`px-8 py-3 rounded-full border-2 transition-all duration-300 ${selectedCategory === undefined ? 'bg-[var(--brand-primary-900)] text-white border-[var(--brand-primary-900)] shadow-lg' : 'border-stone-300 dark:border-zinc-700 hover:border-[var(--brand-primary-400)]'}`}
                    >
                        All Items
                    </button>
                    {categories?.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedCategory(c.id)}
                            className={`px-8 py-3 rounded-full border-2 transition-all duration-300 ${selectedCategory === c.id ? 'bg-[var(--brand-primary-900)] text-white border-[var(--brand-primary-900)] shadow-lg' : 'border-stone-300 dark:border-zinc-700 hover:border-[var(--brand-primary-400)]'}`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>

                <div className="mb-16 flex justify-center">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-sans"
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
                    <ProductSkeletonGrid count={8} columns={4} />
                ) : (
                    <div id="boutique-products" className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-8 space-y-8 font-sans">
                        {products?.map((product) => (
                            <div 
                                key={product.id} 
                                className="break-inside-avoid group bg-white dark:bg-zinc-900 p-5 shadow-sm hover:shadow-2xl transition-all duration-500 border border-stone-100 dark:border-zinc-800 cursor-pointer"
                                onClick={() => setSelectedProduct(product)}
                            >
                                <div className="relative aspect-[4/5] overflow-hidden mb-5 bg-stone-50 dark:bg-zinc-800">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    {product.image && (
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                        />
                                    )}
                                    <StockBadge stockQuantity={product.stockQuantity} className="absolute top-4 left-4" />

                                    <button
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute top-4 right-4 p-2 rounded-full bg-white/90 dark:bg-zinc-800/90 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white dark:hover:bg-zinc-800"
                                    >
                                        <Heart className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
                                    </button>

                                    <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/70 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500 flex justify-center">
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
                                            className="bg-white text-black px-10 py-4 text-xs font-serif uppercase tracking-[0.3em] hover:bg-black hover:text-white border-2 border-black dark:border-white dark:bg-black dark:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-serif mb-2 group-hover:text-[var(--brand-primary-700)] transition-colors">{product.name}</h3>
                                    {product.salePrice ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <p className="text-base text-red-600 dark:text-red-400 font-medium">{formatCurrency(Number(product.salePrice))}</p>
                                            <p className="text-sm text-zinc-400 line-through">{formatCurrency(Number(product.price))}</p>
                                        </div>
                                    ) : (
                                        <p className="text-base text-[var(--brand-primary-600)] font-medium">{formatCurrency(product.price)}</p>
                                    )}
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
