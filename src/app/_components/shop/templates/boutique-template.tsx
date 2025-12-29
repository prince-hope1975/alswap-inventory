"use client";

import { useState } from "react";
import { type RouterOutputs } from "~/trpc/react";
import { ProductCard } from "../product-card";
import { ShopNavbar } from "../parts/shop-navbar";
import { useCart } from "../cart-context";
import type { StoreConfig } from "~/types/store-config";
import { Filter, Sparkles } from "lucide-react";
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

    return (
        <div className="min-h-screen bg-[#fcfbf9] dark:bg-[#121212] text-zinc-800 dark:text-zinc-200 font-serif selection:bg-[var(--brand-primary-100)] selection:text-[var(--brand-primary-900)]">
            {/* Boutique Navbar - Elegant, sticky */}
            <ShopNavbar
                tenant={tenant}
                search={search}
                setSearch={setSearch}
                className="!bg-[#fcfbf9]/95 dark:!bg-[#121212]/95 !border-b !border-stone-200 dark:!border-stone-800 sticky top-0"
                showSearch={false} // Boutique often hides search behind an icon
            />

            {/* Split Screen Hero */}
            {config.showHero && (
                <div className="flex flex-col md:flex-row h-[70vh] w-full overflow-hidden">
                    <div className="w-full md:w-1/2 bg-[var(--brand-primary-900)] text-white flex flex-col justify-center p-12 md:p-24 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat" />
                        <span className="relative z-10 text-xs tracking-[0.3em] uppercase mb-4 opacity-80">Collection 01</span>
                        <h1 className="relative z-10 text-5xl md:text-6xl font-serif italic mb-6 leading-tight">
                            {config.heroTitle || <span dangerouslySetInnerHTML={{ __html: "Timeless <br/> Elegance" }} />}
                        </h1>
                        <p className="relative z-10 text-lg opacity-80 font-sans max-w-sm leading-relaxed mb-8">
                            {config.heroDescription || "Discover pieces that speak a language of their own. Handpicked for the discerning taste."}
                        </p>
                        <button 
                            onClick={() => document.getElementById('boutique-products')?.scrollIntoView({ behavior: 'smooth' })}
                            className="relative z-10 w-fit border border-white/30 hover:bg-white hover:text-[var(--brand-primary-900)] px-8 py-3 transition-all duration-500 font-sans text-sm tracking-widest uppercase"
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

            <main className="container mx-auto px-4 md:px-8 py-16">

                {/* Category Pills - Centered */}
                <div className="flex flex-wrap justify-center gap-4 mb-12 font-sans text-sm">
                    <button
                        onClick={() => setSelectedCategory(undefined)}
                        className={`px-6 py-2 rounded-full border transition-all ${selectedCategory === undefined ? 'bg-[var(--brand-primary-900)] text-white border-[var(--brand-primary-900)]' : 'border-stone-200 dark:border-zinc-800 hover:border-[var(--brand-primary-400)]'}`}
                    >
                        All Items
                    </button>
                    {categories?.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedCategory(c.id)}
                            className={`px-6 py-2 rounded-full border transition-all ${selectedCategory === c.id ? 'bg-[var(--brand-primary-900)] text-white border-[var(--brand-primary-900)]' : 'border-stone-200 dark:border-zinc-800 hover:border-[var(--brand-primary-400)]'}`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="mb-16 max-w-4xl mx-auto">
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

                {/* Products - Masonry-ish Grid */}
                {isLoading ? (
                    <ProductSkeletonGrid count={8} columns={4} />
                ) : (
                    <div id="boutique-products" className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-8 space-y-8 font-sans">
                        {products?.map((product) => (
                            <div 
                                key={product.id} 
                                className="break-inside-avoid group bg-white dark:bg-zinc-900 p-4 shadow-sm hover:shadow-xl transition-shadow duration-500 border border-stone-100 dark:border-zinc-800 cursor-pointer"
                                onClick={() => setSelectedProduct(product)}
                            >
                                <div className="relative aspect-[4/5] overflow-hidden mb-4 bg-stone-50 dark:bg-zinc-800">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    {product.image && (
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    )}
                                    <StockBadge stockQuantity={product.stockQuantity} className="absolute top-4 left-4" />
                                    {/* Overlay */}
                                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex justify-center">
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
                                            disabled={product.stockQuantity === 0}
                                            className="bg-white text-black px-8 py-3 text-xs font-serif uppercase tracking-[0.2em] hover:bg-black hover:text-white border border-black dark:border-white dark:bg-black dark:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-serif mb-1 group-hover:text-[var(--brand-primary-700)] transition-colors">{product.name}</h3>
                                    <p className="text-sm text-[var(--brand-primary-600)] font-medium">{formatCurrency(product.price)}</p>
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
