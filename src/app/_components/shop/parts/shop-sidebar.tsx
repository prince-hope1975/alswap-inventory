"use client";

import { type RouterOutputs } from "~/trpc/react";

type Category = RouterOutputs["shop"]["getCategories"][0];

interface ShopSidebarProps {
    categories: Category[] | undefined;
    selectedCategory: number | undefined;
    setSelectedCategory: (id: number | undefined) => void;
    className?: string;
}

export function ShopSidebar({ categories, selectedCategory, setSelectedCategory, className = "" }: ShopSidebarProps) {
    return (
        <aside className={`w-full lg:w-64 flex-shrink-0 ${className}`}>
            <div className="sticky top-24 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <h3 className="mb-4 text-lg font-semibold text-white">Categories</h3>
                <div className="space-y-2">
                    <button
                        onClick={() => setSelectedCategory(undefined)}
                        className={`w-full rounded-lg px-4 py-2 text-left text-sm transition-colors ${selectedCategory === undefined
                            ? "bg-purple-600 text-white"
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                            }`}
                    >
                        All Products
                    </button>
                    {categories?.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`w-full rounded-lg px-4 py-2 text-left text-sm transition-colors ${selectedCategory === category.id
                                ? "bg-purple-600 text-white"
                                : "text-gray-400 hover:bg-white/5 hover:text-white"
                                }`}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>
            </div>
        </aside>
    );
}
