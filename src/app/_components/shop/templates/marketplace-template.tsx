"use client";

import { useState } from "react";
import { type RouterOutputs } from "~/trpc/react";
import { ProductCard } from "../product-card";
import { ShopNavbar } from "../parts/shop-navbar";
import { useCart } from "../cart-context";
import type { StoreConfig } from "~/types/store-config";
import { ShoppingBag, Star, Zap } from "lucide-react";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { ProductDetailModal } from "../parts/product-detail-modal";
import { ShopFilters, type SortOption } from "../parts/shop-filters";
import { ProductSkeletonGrid } from "../parts/product-skeleton";
import { StockBadge } from "../parts/stock-badge";

type ShopDetails = RouterOutputs["shop"]["getShopDetails"];
type Products = RouterOutputs["shop"]["getProducts"];
type Categories = RouterOutputs["shop"]["getCategories"];
type Product = Products[number];

interface MarketplaceTemplateProps {
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

export function MarketplaceTemplate({
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
}: MarketplaceTemplateProps) {
    const tenant = shopDetails?.tenant;
    const { addItem } = useCart();
    const { formatCurrency } = useCurrency();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    return (
        <div className="min-h-screen bg-[#f1f1f2] dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans">
            {/* Marketplace Navbar - Bright Brand Color */}
            <ShopNavbar
                tenant={tenant}
                search={search}
                setSearch={setSearch}
                className="!bg-[var(--brand-primary-600)] !backdrop-blur-none !border-none !text-white shadow-md mb-4"
            />

            <main className="container mx-auto px-4 pt-24 pb-12">
                {/* Marketplace Hero Layout: Left Menu | Slider | Right Promo */}
                {config.showHero && (
                    <div className="flex gap-4 mb-6 h-[380px]">
                        {/* Left Menu - Categories and Filters */}
                        <div className="hidden lg:block w-52 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-y-auto">
                            <div className="p-3 border-b dark:border-gray-700 flex items-center gap-2 font-medium">
                                <ShoppingBag size={18} /> Categories
                            </div>
                            <div className="py-2">
                                <button
                                    onClick={() => setSelectedCategory(undefined)}
                                    className={`text-left w-full px-4 py-2 text-xs hover:text-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-50)] dark:hover:bg-gray-700 ${selectedCategory === undefined ? 'text-[var(--brand-primary-600)] font-bold' : ''}`}
                                >
                                    All Categories
                                </button>
                                {categories?.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setSelectedCategory(c.id)}
                                        className={`text-left w-full px-4 py-2 text-xs hover:text-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-50)] dark:hover:bg-gray-700 truncate ${selectedCategory === c.id ? 'text-[var(--brand-primary-600)] font-bold' : ''}`}
                                    >
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                            <div className="border-t dark:border-gray-700 mt-2">
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
                        </div>

                        {/* Middle - Slider (Static for now) */}
                        <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden relative group">
                            {/* Hero Image / Banner */}
                            <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-primary-600)] to-[var(--brand-primary-900)] opacity-90" />
                            <img src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=2070" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50" />

                            <div className="relative z-10 p-12 h-full flex flex-col justify-center text-white">
                                <h2 className="text-4xl font-bold mb-4">{config.heroTitle || "Official Store"}</h2>
                                <p className="text-lg mb-6 max-w-lg">{config.heroDescription || "Get the best deals on electronics, fashion, and more. Fast delivery nationwide."}</p>
                                <button className="bg-[var(--brand-primary-500)] hover:bg-[var(--brand-primary-600)] text-white px-8 py-3 rounded shadow-lg w-fit font-bold">
                                    Shop Now
                                </button>
                            </div>
                        </div>

                        {/* Right - Promo Boxes */}
                        <div className="hidden xl:flex w-52 flex-col gap-4">
                            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex flex-col items-center justify-center text-center">
                                <div className="w-10 h-10 rounded-full bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)] flex items-center justify-center mb-2">
                                    <Zap size={20} />
                                </div>
                                <h4 className="font-bold text-sm uppercase">Flash Sales</h4>
                                <p className="text-xs text-gray-500 mt-1">Every Friday</p>
                            </div>
                            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex flex-col items-center justify-center text-center">
                                <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center mb-2">
                                    <Star size={20} />
                                </div>
                                <h4 className="font-bold text-sm uppercase">Best Sellers</h4>
                                <p className="text-xs text-gray-500 mt-1">Top rated items</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Product Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4 border-b pb-2 dark:border-gray-700">
                        <h3 className="text-xl font-bold text-[var(--brand-primary-600)]">Top Picks For You</h3>
                        <button className="text-sm text-[var(--brand-primary-600)] font-medium hover:underline">See All</button>
                    </div>

                    {isLoading ? (
                        <ProductSkeletonGrid count={10} columns={5} />
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                            {products?.map((product) => (
                                <div 
                                    key={product.id} 
                                    className="group hover:shadow-lg transition-shadow border border-transparent hover:border-gray-200 dark:hover:border-gray-700 rounded p-2 cursor-pointer"
                                    onClick={() => setSelectedProduct(product)}
                                >
                                    <div className="relative aspect-square mb-2 overflow-hidden rounded bg-gray-100 dark:bg-gray-700">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        {product.image && <img src={product.image} className="object-cover w-full h-full group-hover:scale-105 transition-transform" />}
                                        <StockBadge stockQuantity={product.stockQuantity ?? 0} className="absolute top-2 left-2" />
                                    </div>
                                    <h4 className="text-xs sm:text-sm font-medium line-clamp-2 mb-1 group-hover:text-[var(--brand-primary-600)]">{product.name}</h4>
                                    <div className="font-bold text-sm sm:text-base">
                                        {formatCurrency(product.price)}
                                    </div>
                                    <div className="text-xs text-gray-400 line-through">
                                        {formatCurrency(Number(product.price) * 1.2)}
                                    </div>
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
                                        className="w-full mt-2 bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-xs py-2 uppercase tracking-wide rounded-sm font-extrabold opacity-0 group-hover:opacity-100 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ADD TO CART
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <ProductDetailModal
                product={selectedProduct}
                isOpen={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
                onAddToCart={(product) => {
                    addItem({
                        productId: product.id,
                        name: product.name,
                        price: Number(product.price),
                        image: product.image
                    });
                }}
            />
        </div>
    );
}
