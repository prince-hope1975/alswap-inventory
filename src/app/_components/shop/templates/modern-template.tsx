"use client";

import { useState } from "react";
import { type RouterOutputs } from "~/trpc/react";
import { ProductCard } from "../product-card";
import { ShopNavbar } from "../parts/shop-navbar";
import { ShopHero } from "../parts/shop-hero";
import { ShopSidebar } from "../parts/shop-sidebar";
import { ShopFilters, type SortOption } from "../parts/shop-filters";
import { ProductSkeletonGrid } from "../parts/product-skeleton";
import { ProductDetailModal } from "../parts/product-detail-modal";
import { StockBadge } from "../parts/stock-badge";
import type { StoreConfig } from "~/types/store-config";

type ShopDetails = RouterOutputs["shop"]["getShopDetails"];
type Products = RouterOutputs["shop"]["getProducts"];
type Categories = RouterOutputs["shop"]["getCategories"];
type Product = Products[number];

interface ModernTemplateProps {
    shopDetails: ShopDetails | undefined;
    products: Products | undefined;
    categories: Categories | undefined;
    isLoading: boolean;
    search: string;
    setSearch: (value: string) => void;
    selectedCategory: number | undefined;
    setSelectedCategory: (id: number | undefined) => void;
    config: StoreConfig;
    sortBy: SortOption;
    setSortBy: (sort: SortOption) => void;
    priceRange: [number, number];
    setPriceRange: (range: [number, number]) => void;
    inStockOnly: boolean;
    setInStockOnly: (value: boolean) => void;
    onClearFilters: () => void;
}

export function ModernTemplate({
    shopDetails,
    products,
    categories,
    isLoading,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    config,
    sortBy,
    setSortBy,
    priceRange,
    setPriceRange,
    inStockOnly,
    setInStockOnly,
    onClearFilters,
}: ModernTemplateProps) {
    const tenant = shopDetails?.tenant;
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    return (
        <div className="min-h-screen bg-[#0f1016] text-white font-sans selection:bg-[var(--brand-primary-500)]/30">
            {/* Navbar */}
            <ShopNavbar
                tenant={tenant}
                search={search}
                setSearch={setSearch}
                showSearch={true}
            />

            {/* Hero Section */}
            {config.showHero && (
                <ShopHero
                    tenantName={config.heroTitle || tenant?.name}
                    description={config.heroDescription}
                    onShopNow={() => {
                        const el = document.getElementById('products');
                        el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                />
            )}

            {/* Main Content */}
            <div id="products" className={`container mx-auto px-4 pb-24 ${!config.showHero ? 'pt-32' : ''}`}>
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Filters */}
                    <div className="lg:w-72 space-y-6">
                        <ShopSidebar
                            categories={categories}
                            selectedCategory={selectedCategory}
                            setSelectedCategory={setSelectedCategory}
                        />
                        
                        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
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

                    {/* Product Grid */}
                    <div className="flex-1">
                        {isLoading ? (
                            <ProductSkeletonGrid count={6} columns={3} />
                        ) : products && products.length > 0 ? (
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {products.map((product) => (
                                    <div key={product.id} className="group relative">
                                        <div 
                                            onClick={() => setSelectedProduct(product)}
                                            className="cursor-pointer"
                                        >
                                            <ProductCard product={product} />
                                        </div>
                                        <StockBadge 
                                            stockQuantity={product.stockQuantity} 
                                            className="absolute top-3 right-3 z-10"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-center">
                                <p className="text-lg font-medium text-gray-400">No products found</p>
                                <button
                                    onClick={() => {
                                        setSearch("");
                                        setSelectedCategory(undefined);
                                        onClearFilters();
                                    }}
                                    className="mt-2 text-sm text-[var(--brand-primary-400)] hover:text-[var(--brand-primary-300)]"
                                >
                                    Clear filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
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
