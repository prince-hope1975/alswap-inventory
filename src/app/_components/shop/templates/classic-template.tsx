"use client";

import { useState } from "react";
import { type RouterOutputs } from "~/trpc/react";
import { ProductCard } from "../product-card";
import { ShopNavbar } from "../parts/shop-navbar";
import { ShopFilters, type SortOption } from "../parts/shop-filters";
import { ProductSkeletonGrid } from "../parts/product-skeleton";
import { ProductDetailModal } from "../parts/product-detail-modal";
import { StockBadge } from "../parts/stock-badge";
import { useCart } from "../cart-context";
import type { StoreConfig } from "~/types/store-config";
import { Menu } from "lucide-react";
import { useCurrency } from "~/hooks/use-tenant-settings";

type ShopDetails = RouterOutputs["shop"]["getShopDetails"];
type Products = RouterOutputs["shop"]["getProducts"];
type Categories = RouterOutputs["shop"]["getCategories"];
type Product = Products[number];

interface ClassicTemplateProps {
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

export function ClassicTemplate({
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
}: ClassicTemplateProps) {
    const tenant = shopDetails?.tenant;
    const { addItem } = useCart();
    const { formatCurrency } = useCurrency();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
            {/* Classic Navbar - Solid Background */}
            <ShopNavbar
                tenant={tenant}
                search={search}
                setSearch={setSearch}
                className="!bg-[var(--brand-primary-900)] !backdrop-blur-none !border-none" // Amazon dark blue style override -> Brand Dark
            />

            {/* Sub-header / Category Bar */}
            <div className="bg-[var(--brand-primary-800)] text-white py-2 px-4 text-sm font-medium flex gap-6 overflow-x-auto pt-24">
                <button
                    onClick={() => setSelectedCategory(undefined)}
                    className={`hover:text-[var(--brand-primary-200)] whitespace-nowrap ${selectedCategory === undefined ? 'text-[var(--brand-primary-100)] font-bold' : ''}`}
                >
                    <Menu className="inline-block h-4 w-4 mr-1" />
                    All
                </button>
                {categories?.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => setSelectedCategory(c.id)}
                        className={`hover:text-[var(--brand-primary-200)] whitespace-nowrap ${selectedCategory === c.id ? 'text-[var(--brand-primary-100)] font-bold' : ''}`}
                    >
                        {c.name}
                    </button>
                ))}
            </div>

            <main className="container mx-auto px-4 py-6">
                <div className="flex gap-6">
                    {/* Left Sidebar - Departments + Filters */}
                    <div className="hidden lg:block w-64 flex-shrink-0 space-y-4">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-sm shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="font-bold text-base mb-3">Departments</h3>
                            <ul className="space-y-1 text-sm">
                                <li className="cursor-pointer hover:text-[#d48100]" onClick={() => setSelectedCategory(undefined)}>Any Department</li>
                                {categories?.map(c => (
                                    <li
                                        key={c.id}
                                        className={`cursor-pointer hover:text-[#d48100] ${selectedCategory === c.id ? 'font-bold text-[#b12704]' : ''}`}
                                        onClick={() => setSelectedCategory(c.id)}
                                    >
                                        {c.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-sm shadow-sm border border-gray-200 dark:border-gray-700">
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

                    {/* Main Content */}
                    <div className="flex-1">
                        <div className="mb-4">
                            <h2 className="text-xl font-bold">Results</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Check each product page for other buying options.</p>
                        </div>

                        {isLoading ? (
                            <ProductSkeletonGrid count={8} columns={4} />
                        ) : products && products.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                {products.map((product) => (
                                    <div 
                                        key={product.id} 
                                        className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-sm hover:shadow-md transition-shadow relative"
                                    >
                                        {/* Simplified Product Card for Classic View */}
                                        <div 
                                            className="aspect-square bg-gray-100 dark:bg-gray-700 mb-4 rounded-sm relative overflow-hidden cursor-pointer"
                                            onClick={() => setSelectedProduct(product)}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            {product.image && <img src={product.image} alt={product.name} className="object-cover w-full h-full" />}
                                            <StockBadge stockQuantity={product.stockQuantity} className="absolute top-2 right-2" />
                                        </div>
                                        <h3 
                                            className="text-base font-medium line-clamp-2 mb-1 hover:text-[#d48100] cursor-pointer"
                                            onClick={() => setSelectedProduct(product)}
                                        >
                                            {product.name}
                                        </h3>
                                        <div className="text-2xl font-medium mb-1">
                                            {formatCurrency(product.price)}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Ships to Nigeria</p>
                                        <button
                                            onClick={() => addItem({
                                                productId: product.id,
                                                name: product.name,
                                                price: Number(product.price),
                                                image: product.image
                                            })}
                                            disabled={product.stockQuantity === 0}
                                            className="w-full bg-[#fa8900] hover:bg-[#e67e00] text-white border border-transparent rounded-full py-1.5 text-sm shadow-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {product.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm">
                                <p>No products found matching your criteria.</p>
                                <button
                                    onClick={() => {
                                        setSearch("");
                                        setSelectedCategory(undefined);
                                        onClearFilters();
                                    }}
                                    className="mt-3 text-[#d48100] hover:text-[#e67e00] font-medium"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            
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
