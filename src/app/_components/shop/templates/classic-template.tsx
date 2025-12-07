"use client";

import { type RouterOutputs } from "~/trpc/react";
import { ProductCard } from "../product-card";
import { ShopNavbar } from "../parts/shop-navbar";
import type { StoreConfig } from "~/types/store-config";
import { Menu } from "lucide-react";

type ShopDetails = RouterOutputs["shop"]["getShopDetails"];
type Products = RouterOutputs["shop"]["getProducts"];
type Categories = RouterOutputs["shop"]["getCategories"];

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
    // config, // Using config for themes/toggles if needed
}: ClassicTemplateProps) {
    const tenant = shopDetails?.tenant;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
            {/* Classic Navbar - Solid Background */}
            <ShopNavbar
                tenant={tenant}
                search={search}
                setSearch={setSearch}
                className="!bg-[#232f3e] !backdrop-blur-none !border-none" // Amazon dark blue style override
            />

            {/* Sub-header / Category Bar */}
            <div className="bg-[#37475a] text-white py-2 px-4 text-sm font-medium flex gap-6 overflow-x-auto pt-24">
                <button
                    onClick={() => setSelectedCategory(undefined)}
                    className={`hover:text-amber-400 whitespace-nowrap ${selectedCategory === undefined ? 'text-amber-400 font-bold' : ''}`}
                >
                    <Menu className="inline-block h-4 w-4 mr-1" />
                    All
                </button>
                {categories?.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => setSelectedCategory(c.id)}
                        className={`hover:text-amber-400 whitespace-nowrap ${selectedCategory === c.id ? 'text-amber-400 font-bold' : ''}`}
                    >
                        {c.name}
                    </button>
                ))}
            </div>

            <main className="container mx-auto px-4 py-6">
                <div className="flex gap-6">
                    {/* Left Sidebar - Departments */}
                    <div className="hidden lg:block w-56 flex-shrink-0">
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
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        <div className="mb-4">
                            <h2 className="text-xl font-bold">Results</h2>
                            <p className="text-sm text-gray-500">Check each product page for other buying options.</p>
                        </div>

                        {isLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="h-80 animate-pulse bg-gray-200 dark:bg-gray-800 rounded-sm" />
                                ))}
                            </div>
                        ) : products && products.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                {products.map((product) => (
                                    <div key={product.id} className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-sm hover:shadow-md transition-shadow">
                                        {/* Simplified Product Card for Classic View */}
                                        <div className="aspect-square bg-gray-100 dark:bg-gray-700 mb-4 rounded-sm relative overflow-hidden">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            {product.image && <img src={product.image} alt={product.name} className="object-cover w-full h-full" />}
                                        </div>
                                        <h3 className="text-base font-medium line-clamp-2 mb-1 hover:text-[#d48100] cursor-pointer">
                                            {product.name}
                                        </h3>
                                        <div className="text-2xl font-medium mb-1">
                                            <span className="text-xs align-top top-1 relative">₦</span>
                                            {Number(product.price).toLocaleString()}
                                        </div>
                                        <p className="text-xs text-gray-500 mb-3">Ships to Nigeria</p>
                                        <button className="w-full bg-[#ffd814] hover:bg-[#f7ca00] text-black border border-[#fcd200] rounded-full py-1.5 text-sm shadow-sm">
                                            Add to Cart
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm">
                                <p>No products found matching your criteria.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
