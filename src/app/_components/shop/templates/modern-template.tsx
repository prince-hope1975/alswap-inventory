"use client";

import { type RouterOutputs } from "~/trpc/react";
import { ProductCard } from "../product-card";
import { ShopNavbar } from "../parts/shop-navbar";
import { ShopHero } from "../parts/shop-hero";
import { ShopSidebar } from "../parts/shop-sidebar";
import { StoreConfig } from "~/types/store-config";

type ShopDetails = RouterOutputs["shop"]["getShopDetails"];
type Products = RouterOutputs["shop"]["getProducts"];
type Categories = RouterOutputs["shop"]["getCategories"];

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
}: ModernTemplateProps) {
    const tenant = shopDetails?.tenant;

    return (
        <div className="min-h-screen bg-[#0f1016] text-white font-sans selection:bg-purple-500/30">
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
                    tenantName={tenant?.name}
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
                    <ShopSidebar
                        categories={categories}
                        selectedCategory={selectedCategory}
                        setSelectedCategory={setSelectedCategory}
                    />

                    {/* Product Grid */}
                    <div className="flex-1">
                        {isLoading ? (
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-white/5" />
                                ))}
                            </div>
                        ) : products && products.length > 0 ? (
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {products.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-center">
                                <p className="text-lg font-medium text-gray-400">No products found</p>
                                <button
                                    onClick={() => {
                                        setSearch("");
                                        setSelectedCategory(undefined);
                                    }}
                                    className="mt-2 text-sm text-purple-400 hover:text-purple-300"
                                >
                                    Clear filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
