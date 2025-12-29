"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "~/trpc/react";
import { useCart } from "./cart-context";
import { CheckoutModal } from "./checkout-modal";
import type { StoreConfig } from "~/types/store-config";
import type { SortOption } from "./parts/shop-filters";

// Templates
import { ModernTemplate } from "./templates/modern-template";
import { ClassicTemplate } from "./templates/classic-template";
import { MarketplaceTemplate } from "./templates/marketplace-template";
import { MinimalTemplate } from "./templates/minimal-template";
import { BoutiqueTemplate } from "./templates/boutique-template";
import { ShoppingCart, X } from "lucide-react";
import { type RouterOutputs } from "~/trpc/react";
import { useCurrency } from "~/hooks/use-tenant-settings";

type ShopDetails = RouterOutputs["shop"]["getShopDetails"];
type Products = RouterOutputs["shop"]["getProducts"];
type Categories = RouterOutputs["shop"]["getCategories"];

interface StoreLayoutProps {
    initialShopDetails?: ShopDetails;
    initialProducts?: Products;
    initialCategories?: Categories;
}

export function StoreLayout({ initialShopDetails, initialProducts, initialCategories }: StoreLayoutProps) {
    const { items, totalItems, isCartOpen, setIsCartOpen, removeItem, updateQuantity, totalAmount } = useCart();
    const { formatCurrency } = useCurrency();
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
    
    // Filter and sort state
    const [sortBy, setSortBy] = useState<SortOption>("newest");
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
    const [inStockOnly, setInStockOnly] = useState(false);

    // Fetch data with initial data from server
    const { data: shopDetails, isLoading: isShopLoading } = api.shop.getShopDetails.useQuery(undefined, {
        initialData: initialShopDetails
    });
    const { data: categories } = api.shop.getCategories.useQuery(undefined, {
        initialData: initialCategories
    });
    const { data: products, isLoading: isProductsLoading } = api.shop.getProducts.useQuery({
        search,
        categoryId: selectedCategory,
    }, {
        initialData: (search === "" && selectedCategory === undefined) ? initialProducts : undefined
    });

    const tenant = shopDetails?.tenant;
    // Safe cast or default for storeConfig since Drizzle might not have fully propagated types in local dev env without restart
    const config = (tenant?.storeConfig as StoreConfig) || {
        template: "modern",
        themeMode: "system",
        showHero: true,
        showArticles: false
    };

    // Handle Theme Mode
    useEffect(() => {
        const root = document.documentElement;
        if (config.themeMode === 'dark') {
            root.classList.add('dark');
        } else if (config.themeMode === 'light') {
            root.classList.remove('dark');
        }
        else if (config.themeMode === 'system') {
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const localTheme = localStorage.getItem('theme'); // 'theme' key from ThemeScript

            // If local storage is set, respect it, otherwise system
            if (localTheme === 'dark' || (!localTheme && systemPrefersDark)) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
    }, [config.themeMode]);

    // Client-side filtering and sorting
    const filteredAndSortedProducts = useMemo(() => {
        if (!products) return [];
        
        let filtered = [...products].filter(product => product != null);
        
        // Filter by price range
        filtered = filtered.filter(product => {
            if (!product?.price) return false;
            const price = parseFloat(product.price);
            return !isNaN(price) && price >= priceRange[0] && price <= priceRange[1];
        });
        
        // Filter by stock availability
        if (inStockOnly) {
            filtered = filtered.filter(product => product?.stockQuantity > 0);
        }
        
        // Sort products
        filtered.sort((a, b) => {
            switch (sortBy) {
                case "name-asc":
                    return (a?.name || "").localeCompare(b?.name || "");
                case "name-desc":
                    return (b?.name || "").localeCompare(a?.name || "");
                case "price-asc":
                    return parseFloat(a?.price || "0") - parseFloat(b?.price || "0");
                case "price-desc":
                    return parseFloat(b?.price || "0") - parseFloat(a?.price || "0");
                case "newest":
                default:
                    return new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();
            }
        });
        
        return filtered;
    }, [products, priceRange, inStockOnly, sortBy]);

    const handleClearFilters = () => {
        setSortBy("newest");
        setPriceRange([0, 1000000]);
        setInStockOnly(false);
    };

    const commonProps = {
        shopDetails,
        products: filteredAndSortedProducts,
        categories,
        isLoading: isShopLoading || isProductsLoading,
        search,
        setSearch,
        selectedCategory,
        setSelectedCategory,
        config,
        // Filter props
        sortBy,
        setSortBy,
        priceRange,
        setPriceRange,
        inStockOnly,
        setInStockOnly,
        onClearFilters: handleClearFilters,
    };

    return (
        <div>
            {/* Template Resolver */}
            {config.template === "modern" && <ModernTemplate {...commonProps} />}
            {config.template === "classic" && <ClassicTemplate {...commonProps} />}
            {config.template === "marketplace" && <MarketplaceTemplate {...commonProps} />}
            {config.template === "minimal" && <MinimalTemplate {...commonProps} />}
            {config.template === "boutique" && <BoutiqueTemplate {...commonProps} />}
            {!["modern", "classic", "marketplace", "minimal", "boutique"].includes(config.template) && <ModernTemplate {...commonProps} />}

            {/* Global Cart Drawer */}
            {isCartOpen && (
                <>
                    <div
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsCartOpen(false)}
                    />
                    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#1a1b2e] dark:bg-gray-900 shadow-2xl border-l border-white/10 dark:border-gray-800 transform transition-transform duration-300 ease-in-out font-sans">
                        <div className="flex h-full flex-col">
                            <div className="flex items-center justify-between border-b border-white/10 dark:border-gray-800 p-6">
                                <h2 className="text-xl font-bold text-white">Shopping Cart ({totalItems})</h2>
                                <button
                                    onClick={() => setIsCartOpen(false)}
                                    className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {items.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center text-center">
                                        <ShoppingCart className="mb-4 h-16 w-16 text-gray-600" />
                                        <p className="text-lg font-medium text-gray-400">Your cart is empty</p>
                                        <button
                                            onClick={() => setIsCartOpen(false)}
                                            className="mt-4 rounded-full bg-white/10 px-6 py-2 text-sm font-medium text-white hover:bg-white/20"
                                        >
                                            Start Shopping
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {items.map((item) => (
                                            <div key={item.productId} className="flex gap-4">
                                                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-white/5 relative">
                                                    {item.image ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">No Img</div>
                                                    )}
                                                </div>
                                                <div className="flex flex-1 flex-col justify-between">
                                                    <div>
                                                        <h3 className="font-medium text-white line-clamp-1">{item.name}</h3>
                                                        <p className="text-sm text-purple-400">{formatCurrency(item.price)}</p>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 rounded-lg bg-white/5 px-2 py-1">
                                                            <button
                                                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                                                className="text-gray-400 hover:text-white"
                                                            >
                                                                -
                                                            </button>
                                                            <span className="text-sm font-medium text-white w-4 text-center">{item.quantity}</span>
                                                            <button
                                                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                                                className="text-gray-400 hover:text-white"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={() => removeItem(item.productId)}
                                                            className="text-xs text-red-400 hover:text-red-300"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {items.length > 0 && (
                                <div className="border-t border-white/10 dark:border-gray-800 p-6 bg-[#1a1b2e] dark:bg-gray-900">
                                    <div className="mb-4 flex items-center justify-between text-lg font-bold text-white">
                                        <span>Total</span>
                                        <span>{formatCurrency(totalAmount)}</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsCartOpen(false);
                                            setIsCheckoutOpen(true);
                                        }}
                                        className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 py-4 font-bold text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-purple-500/40 hover:scale-[1.02]"
                                    >
                                        Proceed to Checkout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Checkout Modal */}
            {isCheckoutOpen && <CheckoutModal onClose={() => setIsCheckoutOpen(false)} />}
        </div>
    );
}
