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
import { Menu, ChevronRight } from "lucide-react";
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

    const selectedCategoryName = categories?.find(c => c.id === selectedCategory)?.name;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
            <ShopNavbar
                tenant={tenant}
                search={search}
                setSearch={setSearch}
                className="!bg-[var(--brand-primary-900)] !backdrop-blur-none !border-none"
            />

            <div className="bg-[var(--brand-primary-800)] text-white py-3 px-4 text-sm font-medium flex gap-6 overflow-x-auto pt-24">
                <button
                    onClick={() => setSelectedCategory(undefined)}
                    className={`flex items-center gap-2 hover:text-[var(--brand-primary-200)] whitespace-nowrap transition-colors ${selectedCategory === undefined ? 'text-white font-bold' : ''}`}
                >
                    <Menu className="h-4 w-4" />
                    All Departments
                </button>
                {categories?.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => setSelectedCategory(c.id)}
                        className={`hover:text-[var(--brand-primary-200)] whitespace-nowrap transition-colors ${selectedCategory === c.id ? 'text-white font-bold' : ''}`}
                    >
                        {c.name}
                    </button>
                ))}
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="mb-6 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>Home</span>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-gray-900 dark:text-white font-medium">
                        {selectedCategoryName || 'All Products'}
                    </span>
                </div>

                <div className="flex gap-8">
                    <div className="hidden lg:block w-72 flex-shrink-0 space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="font-bold text-lg mb-4">Departments</h3>
                            <ul className="space-y-2 text-sm">
                                <li
                                    className={`cursor-pointer hover:text-[var(--brand-primary-600)] transition-colors py-1 ${selectedCategory === undefined ? 'font-bold text-[var(--brand-primary-600)]' : ''}`}
                                    onClick={() => setSelectedCategory(undefined)}
                                >
                                    All Departments
                                </li>
                                {categories?.map(c => (
                                    <li
                                        key={c.id}
                                        className={`cursor-pointer hover:text-[var(--brand-primary-600)] transition-colors py-1 ${selectedCategory === c.id ? 'font-bold text-[var(--brand-primary-600)]' : ''}`}
                                        onClick={() => setSelectedCategory(c.id)}
                                    >
                                        {c.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
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

                    <div className="flex-1">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-2">
                                {selectedCategoryName || 'All Products'}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {products ? `${products.length} products available` : 'Loading...'}
                            </p>
                        </div>

                        {isLoading ? (
                            <ProductSkeletonGrid count={8} columns={4} />
                        ) : products && products.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                                {products.map((product) => (
                                    <div 
                                        key={product.id} 
                                        className="bg-white dark:bg-gray-800 p-5 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg transition-all duration-300 relative group"
                                    >
                                        <div 
                                            className="aspect-square bg-gray-100 dark:bg-gray-700 mb-4 rounded-lg relative overflow-hidden cursor-pointer"
                                            onClick={() => setSelectedProduct(product)}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            {product.image && (
                                                <img
                                                    src={product.image}
                                                    alt={product.name}
                                                    className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                                                />
                                            )}
                                            <StockBadge stockQuantity={product.stockQuantity} className="absolute top-2 right-2" />
                                        </div>
                                        <h3 
                                            className="text-base font-semibold line-clamp-2 mb-2 hover:text-[var(--brand-primary-600)] cursor-pointer transition-colors"
                                            onClick={() => setSelectedProduct(product)}
                                        >
                                            {product.name}
                                        </h3>
                                        <div className="flex items-baseline gap-2 mb-3">
                                            {product.salePrice ? (
                                                <>
                                                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                                        {formatCurrency(Number(product.salePrice))}
                                                    </div>
                                                    <div className="text-sm text-gray-400 line-through">
                                                        {formatCurrency(Number(product.price))}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-2xl font-bold">
                                                    {formatCurrency(product.price)}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => addItem({
                                                productId: product.id,
                                                name: product.name,
                                                price: Number(product.salePrice || product.price),
                                                image: product.image
                                            })}
                                            disabled={product.stockQuantity === 0}
                                            className="w-full bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white border border-transparent rounded-lg py-2.5 text-sm shadow-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
                                        >
                                            {product.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-16 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                                <p className="text-lg font-medium mb-2">No products found</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Try adjusting your filters</p>
                                <button
                                    onClick={() => {
                                        setSearch("");
                                        setSelectedCategory(undefined);
                                        onClearFilters();
                                    }}
                                    className="text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] font-semibold transition-colors"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
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
