"use client";

import { useState } from "react";
import { type RouterOutputs } from "~/trpc/react";
import { ShopNavbar } from "../parts/shop-navbar";
import { useCart } from "../cart-context";
import type { StoreConfig } from "~/types/store-config";
import { 
    ShoppingCart, 
    Truck, 
    RotateCcw, 
    Shield, 
    Star, 
    ChevronDown,
    SlidersHorizontal,
    X,
    Flame,
    Clock,
    AlertCircle
} from "lucide-react";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { ProductDetailModal } from "../parts/product-detail-modal";
import { type SortOption } from "../parts/shop-filters";
import { ProductSkeletonGrid } from "../parts/product-skeleton";

type ShopDetails = RouterOutputs["shop"]["getShopDetails"];
type Products = RouterOutputs["shop"]["getProducts"];
type Categories = RouterOutputs["shop"]["getCategories"];
type Product = Products[number];

interface ConversionTemplateProps {
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

// Trust badge component
function TrustBadge({ icon: Icon, title, subtitle }: { icon: typeof Truck; title: string; subtitle: string }) {
    return (
        <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary-100)] dark:bg-[var(--brand-primary-900)]/30 text-[var(--brand-primary-600)] dark:text-[var(--brand-primary-400)]">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
            </div>
        </div>
    );
}

// Sale badge component
function SaleBadge({ percentage }: { percentage: number }) {
    return (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
            <Flame className="h-3 w-3" />
            -{percentage}%
        </div>
    );
}

// Stock indicator component
function StockIndicator({ quantity }: { quantity: number | null }) {
    if (quantity === null || quantity === -1) return null;
    
    if (quantity === 0) {
        return (
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-full text-xs font-medium">
                <AlertCircle className="h-3 w-3" />
                Out of Stock
            </div>
        );
    }
    
    if (quantity <= 5) {
        return (
            <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-full text-xs font-medium animate-pulse">
                <Clock className="h-3 w-3" />
                Only {quantity} left!
            </div>
        );
    }
    
    return (
        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full text-xs font-medium">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            In Stock
        </div>
    );
}

// Product card for conversion template
function ConversionProductCard({ 
    product, 
    onQuickView 
}: { 
    product: Product; 
    onQuickView: () => void;
}) {
    const { addItem } = useCart();
    const { formatCurrency } = useCurrency();
    const price = Number(product.price);
    const salePrice = product.salePrice ? Number(product.salePrice) : null;
    const displayPrice = salePrice ?? price;
    const salePercentage = salePrice ? Math.round(((price - salePrice) / price) * 100) : 0;
    const isOutOfStock = product.stockQuantity === 0;

    return (
        <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl dark:hover:shadow-black/30 hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-300">
            {salePercentage > 0 && <SaleBadge percentage={salePercentage} />}
            
            <div 
                className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-gray-900 cursor-pointer"
                onClick={onQuickView}
            >
                {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-gray-500">
                        No Image
                    </div>
                )}
                
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="rounded-full bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white">
                        Quick View
                    </span>
                </div>
            </div>

            <div className="flex flex-1 flex-col p-4">
                {product.category && (
                    <span className="mb-1.5 text-xs font-medium text-[var(--brand-primary-600)] dark:text-[var(--brand-primary-400)] uppercase tracking-wide">
                        {product.category.name}
                    </span>
                )}
                
                <h3 
                    className="mb-2 text-base font-semibold text-gray-900 dark:text-white line-clamp-2 cursor-pointer hover:text-[var(--brand-primary-600)] dark:hover:text-[var(--brand-primary-400)] transition-colors"
                    onClick={onQuickView}
                >
                    {product.name}
                </h3>
                
                <div className="mb-3 flex items-baseline gap-2">
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(displayPrice)}
                    </span>
                    {salePrice && (
                        <span className="text-sm text-gray-400 dark:text-gray-500 line-through">
                            {formatCurrency(price)}
                        </span>
                    )}
                </div>
                
                <div className="mb-4">
                    <StockIndicator quantity={product.stockQuantity} />
                </div>
                
                <button
                    onClick={() => {
                        if (!isOutOfStock) {
                            addItem({
                                productId: product.id,
                                name: product.name,
                                price: displayPrice,
                                image: product.image,
                            });
                        }
                    }}
                    disabled={isOutOfStock}
                    className={`mt-auto w-full rounded-xl py-3 font-bold text-sm uppercase tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
                        isOutOfStock 
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                            : 'bg-[var(--brand-primary-600)] text-white hover:bg-[var(--brand-primary-700)] hover:shadow-lg hover:shadow-[var(--brand-primary-500)]/25 active:scale-[0.98]'
                    }`}
                >
                    <ShoppingCart className="h-4 w-4" />
                    {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                </button>
            </div>
        </div>
    );
}

export function ConversionTemplate({
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
}: ConversionTemplateProps) {
    const tenant = shopDetails?.tenant;
    const { totalItems, totalAmount, setIsCartOpen } = useCart();
    const { formatCurrency } = useCurrency();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const hasActiveFilters = 
        selectedCategory !== undefined || 
        priceRange[0] > 0 || 
        priceRange[1] < 1000000 || 
        inStockOnly || 
        sortBy !== "newest";

    return (
        <div className="min-h-screen bg-[#faf9f7] dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
            {/* Navbar */}
            <ShopNavbar
                tenant={tenant}
                search={search}
                setSearch={setSearch}
                className="!bg-white dark:!bg-gray-800 !border-b !border-gray-200 dark:!border-gray-700 !backdrop-blur-none [&_*]:!text-gray-900 dark:[&_*]:!text-gray-100 [&_input]:!bg-gray-50 dark:[&_input]:!bg-gray-700 [&_input]:!border-gray-200 dark:[&_input]:!border-gray-600 [&_input]:!text-gray-900 dark:[&_input]:!text-white [&_input::placeholder]:!text-gray-400"
            />

            {/* Urgency Banner */}
            <div className="fixed top-20 left-0 right-0 z-30 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 py-3 text-center shadow-lg">
                <div className="container mx-auto flex items-center justify-center gap-3 px-4">
                    <Flame className="h-5 w-5 text-yellow-300 animate-pulse" />
                    <span className="text-sm font-bold text-white tracking-wider">
                        {config.heroTitle || "FLASH SALE - LIMITED TIME DEALS - SHOP NOW"}
                    </span>
                    <Flame className="h-5 w-5 text-yellow-300 animate-pulse" />
                </div>
            </div>

            {/* Hero Section */}
            {config.showHero && (
                <section className="relative pt-36 pb-12 overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5 dark:opacity-10">
                        <div className="absolute inset-0" style={{
                            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
                            backgroundSize: '40px 40px'
                        }} />
                    </div>
                    
                    <div className="container relative mx-auto px-4 text-center">
                        <h1 className="mb-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-gray-900 dark:text-white">
                            {config.heroTitle || (
                                <>
                                    Shop <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-primary-500)] to-[var(--brand-primary-700)]">Smart</span>, Save <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">Big</span>
                                </>
                            )}
                        </h1>
                        <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
                            {config.heroDescription || "Discover unbeatable deals on premium products. Fast shipping, easy returns, and prices you'll love."}
                        </p>
                        <button
                            onClick={() => document.getElementById('conversion-products')?.scrollIntoView({ behavior: 'smooth' })}
                            className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-primary-600)] px-8 py-4 font-bold text-white shadow-xl shadow-[var(--brand-primary-500)]/25 hover:shadow-[var(--brand-primary-500)]/40 hover:bg-[var(--brand-primary-700)] transition-all duration-300 hover:scale-105"
                        >
                            Shop Now
                            <ChevronDown className="h-5 w-5 animate-bounce" />
                        </button>
                    </div>
                </section>
            )}

            {/* Trust Badges */}
            <section className={`bg-white dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700 ${!config.showHero ? 'mt-32' : ''}`}>
                <div className="container mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-gray-700">
                        <TrustBadge 
                            icon={Truck} 
                            title="Free Shipping" 
                            subtitle="On orders over ₦50,000" 
                        />
                        <TrustBadge 
                            icon={RotateCcw} 
                            title="Easy Returns" 
                            subtitle="30-day return policy" 
                        />
                        <TrustBadge 
                            icon={Shield} 
                            title="Secure Checkout" 
                            subtitle="100% protected payments" 
                        />
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <main id="conversion-products" className="container mx-auto px-4 py-8">
                {/* Filter Bar */}
                <div className="mb-6 flex flex-col gap-4">
                    {/* Category Pills */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedCategory(undefined)}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                selectedCategory === undefined
                                    ? 'bg-[var(--brand-primary-600)] text-white shadow-md'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-[var(--brand-primary-300)] dark:hover:border-[var(--brand-primary-500)] hover:text-[var(--brand-primary-600)] dark:hover:text-[var(--brand-primary-400)]'
                            }`}
                        >
                            All Products
                        </button>
                        {categories?.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                    selectedCategory === cat.id
                                        ? 'bg-[var(--brand-primary-600)] text-white shadow-md'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-[var(--brand-primary-300)] dark:hover:border-[var(--brand-primary-500)] hover:text-[var(--brand-primary-600)] dark:hover:text-[var(--brand-primary-400)]'
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Filter Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            {/* Results Count */}
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                Showing <span className="font-semibold text-gray-900 dark:text-white">{products?.length || 0}</span> products
                            </span>
                            
                            {/* Active Filters */}
                            {hasActiveFilters && (
                                <button
                                    onClick={() => {
                                        setSelectedCategory(undefined);
                                        onClearFilters();
                                    }}
                                    className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                                >
                                    <X className="h-4 w-4" />
                                    Clear All
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Sort Dropdown */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-500)] focus:border-transparent cursor-pointer"
                            >
                                <option value="newest">Newest First</option>
                                <option value="price-asc">Price: Low to High</option>
                                <option value="price-desc">Price: High to Low</option>
                                <option value="name-asc">Name: A to Z</option>
                                <option value="name-desc">Name: Z to A</option>
                            </select>

                            {/* Advanced Filters Toggle */}
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                                    isFilterOpen
                                        ? 'bg-[var(--brand-primary-600)] text-white border-[var(--brand-primary-600)]'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-[var(--brand-primary-300)] dark:hover:border-[var(--brand-primary-500)]'
                                }`}
                            >
                                <SlidersHorizontal className="h-4 w-4" />
                                Filters
                            </button>
                        </div>
                    </div>

                    {/* Advanced Filters Panel */}
                    {isFilterOpen && (
                        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 shadow-lg dark:shadow-black/30 animate-in slide-in-from-top-2 duration-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Price Range */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">Price Range</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            value={priceRange[0]}
                                            onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                                            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-500)]"
                                            placeholder="Min"
                                        />
                                        <span className="text-gray-400">-</span>
                                        <input
                                            type="number"
                                            value={priceRange[1]}
                                            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                                            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-500)]"
                                            placeholder="Max"
                                        />
                                    </div>
                                </div>

                                {/* Stock Filter */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">Availability</label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={inStockOnly}
                                            onChange={(e) => setInStockOnly(e.target.checked)}
                                            className="h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-[var(--brand-primary-600)] focus:ring-[var(--brand-primary-500)]"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">In Stock Only</span>
                                    </label>
                                </div>

                                {/* Apply Button */}
                                <div className="flex items-end">
                                    <button
                                        onClick={() => setIsFilterOpen(false)}
                                        className="w-full rounded-lg bg-[var(--brand-primary-600)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-primary-700)] transition-colors"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Product Grid */}
                {isLoading ? (
                    <ProductSkeletonGrid count={9} columns={3} />
                ) : products && products.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.map((product) => (
                            <ConversionProductCard
                                key={product.id}
                                product={product}
                                onQuickView={() => setSelectedProduct(product)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex h-96 flex-col items-center justify-center rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
                        <div className="mb-4 h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <ShoppingCart className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No products found</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">Try adjusting your filters or search terms</p>
                        <button
                            onClick={() => {
                                setSearch("");
                                setSelectedCategory(undefined);
                                onClearFilters();
                            }}
                            className="rounded-full bg-[var(--brand-primary-600)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-primary-700)] transition-colors"
                        >
                            Clear All Filters
                        </button>
                    </div>
                )}
            </main>

            {/* Trust Footer */}
            <section className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8">
                <div className="container mx-auto px-4">
                    <div className="flex flex-wrap items-center justify-center gap-8 text-gray-400 dark:text-gray-500">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            <span className="text-sm font-medium">SSL Secured</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Truck className="h-5 w-5" />
                            <span className="text-sm font-medium">Fast Delivery</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <RotateCcw className="h-5 w-5" />
                            <span className="text-sm font-medium">Easy Returns</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Star className="h-5 w-5" />
                            <span className="text-sm font-medium">Top Rated</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sticky Mobile Cart Bar */}
            {totalItems > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl dark:shadow-black/50 lg:hidden safe-area-inset-bottom">
                    <div className="container mx-auto px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Cart ({totalItems} items)</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalAmount)}</p>
                            </div>
                            <button
                                onClick={() => setIsCartOpen(true)}
                                className="flex-1 rounded-xl bg-[var(--brand-primary-600)] py-3.5 font-bold text-white shadow-lg hover:bg-[var(--brand-primary-700)] transition-colors flex items-center justify-center gap-2"
                            >
                                <ShoppingCart className="h-5 w-5" />
                                View Cart
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

