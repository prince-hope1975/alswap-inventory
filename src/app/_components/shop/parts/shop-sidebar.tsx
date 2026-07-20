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
            <div className="sticky top-24 rounded-2xl border border-[#14212b]/15 bg-white p-6 dark:border-white/10 dark:bg-white/5">
                <h3 className="mb-4 text-lg font-semibold text-[#14212b] dark:text-white">Categories</h3>
                <div className="space-y-2">
                    <button
                        onClick={() => setSelectedCategory(undefined)}
                        className={`w-full rounded-lg px-4 py-2 text-left text-sm transition-colors ${selectedCategory === undefined
                            ? "bg-[#0b6e99] text-white"
                            : "text-[#5c6870] hover:bg-[#dcecf2] hover:text-[#14212b] dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                            }`}
                    >
                        All Products
                    </button>
                    {categories?.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`w-full rounded-lg px-4 py-2 text-left text-sm transition-colors ${selectedCategory === category.id
                                ? "bg-[#0b6e99] text-white"
                                : "text-[#5c6870] hover:bg-[#dcecf2] hover:text-[#14212b] dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
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
