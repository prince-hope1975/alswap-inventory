"use client";

import { type RouterOutputs } from "~/trpc/react";

type Category = RouterOutputs["shop"]["getCategories"][0];

interface ShopSidebarProps {
    categories: Category[] | undefined;
    selectedCategory: number | undefined;
    setSelectedCategory: (id: number | undefined) => void;
    className?: string;
}

function itemClass(active: boolean) {
    return `flex w-full min-h-10 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:outline-none ${
        active
            ? "bg-[#0b6e99] font-semibold text-white"
            : "text-[#41515c] hover:bg-[#dcecf2] hover:text-[#14212b] dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
    }`;
}

export function ShopSidebar({ categories, selectedCategory, setSelectedCategory, className = "" }: ShopSidebarProps) {
    return (
        <nav aria-label="Categories" className={`w-full ${className}`}>
            <h3 className="mb-2 px-3 text-xs font-semibold tracking-wide text-[#41515c] uppercase dark:text-gray-300">
                Categories
            </h3>
            <ul className="space-y-0.5">
                <li>
                    <button
                        type="button"
                        aria-pressed={selectedCategory === undefined}
                        onClick={() => setSelectedCategory(undefined)}
                        className={itemClass(selectedCategory === undefined)}
                    >
                        All products
                    </button>
                </li>
                {categories?.map((category) => {
                    const active = selectedCategory === category.id;
                    return (
                        <li key={category.id}>
                            <button
                                type="button"
                                aria-pressed={active}
                                onClick={() => setSelectedCategory(category.id)}
                                className={itemClass(active)}
                            >
                                <span className="truncate">{category.name}</span>
                                {"productCount" in category && (
                                    <span className={`shrink-0 text-xs tabular-nums ${active ? "text-white/80" : "text-[#8a949a]"}`}>
                                        {category.productCount}
                                    </span>
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
