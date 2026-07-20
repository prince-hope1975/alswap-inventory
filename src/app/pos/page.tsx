"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { api } from "~/trpc/react";
import { Search, ShoppingCart, X, Plus, Minus, User, UserX, LayoutGrid, List, Smartphone, Monitor, Trash2, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { ThemeToggle } from "~/components/theme-toggle";
import { ProductCard } from "../_components/pos/product-card";
import { ProductListItem } from "../_components/pos/product-list-item";
import { PaymentModal } from "../_components/pos/payment-modal";
import { ReceiptModal } from "../_components/pos/receipt-modal";
import { cn } from "~/lib/utils";
import { usePosSync } from "~/hooks/use-pos-sync";
import { db } from "~/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { ErrorBoundary } from "~/components/error-boundary";
import { ComponentErrorFallback } from "~/components/route-error-boundary";
import { fuzzySearchArray } from "~/lib/fuzzy-match";
import { useVirtualizer } from '@tanstack/react-virtual';

type CartItem = {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image: string | null;
    sku?: string | null;
};

type ViewMode = "grid" | "list";

export default function POSTerminal() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [customerSearchQuery, setCustomerSearchQuery] = useState("");
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; email: string | null } | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [shiftId, setShiftId] = useState<string | null>(null);
    const { formatCurrency, currency } = useCurrency();

    // UI State
    const [isTouchMode, setIsTouchMode] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("list"); // Default to list
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [lastOrder, setLastOrder] = useState<any>(null);

    // Virtual scroll ref
    const parentRef = useRef<HTMLDivElement>(null);

    // Sync Hook
    const { isOnline, isSyncing, pendingOrdersCount, pullData, pushData } = usePosSync();

    // Detect touch device or load preference
    useEffect(() => {
        const stored = localStorage.getItem("pos_touch_mode");
        if (stored) {
            setIsTouchMode(stored === "true");
        } else {
            const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            setIsTouchMode(isTouch);
            localStorage.setItem("pos_touch_mode", String(isTouch));
        }

        // Load view mode preference
        const storedView = localStorage.getItem("pos_view_mode");
        if (storedView) {
            setViewMode(storedView as ViewMode);
        } else {
            // Default: list for desktop, grid for touch
            const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const defaultView = isTouch ? "grid" : "list";
            setViewMode(defaultView);
            localStorage.setItem("pos_view_mode", defaultView);
        }
    }, []);

    const toggleTouchMode = () => {
        const newValue = !isTouchMode;
        setIsTouchMode(newValue);
        localStorage.setItem("pos_touch_mode", String(newValue));
    };

    const toggleViewMode = () => {
        const newMode = viewMode === "grid" ? "list" : "grid";
        setViewMode(newMode);
        localStorage.setItem("pos_view_mode", newMode);
    };

    // Shift Management - Hybrid Approach
    const { data: currentShift, error: shiftError } = api.pos.getCurrentShift.useQuery(undefined, {
        enabled: isOnline,
        retry: false
    });

    useEffect(() => {
        const syncShift = async () => {
            if (currentShift) {
                setShiftId(currentShift.id);
                await db.settings.put({ key: "currentShift", value: currentShift });
            } else if (!isOnline || shiftError) {
                const cachedShift = await db.settings.get("currentShift");
                if (cachedShift?.value) {
                    setShiftId(cachedShift.value.id);
                }
            }
        };
        void syncShift();
    }, [currentShift, isOnline, shiftError]);

    // Product Search - Enhanced with Fuzzy Search
    const allProducts = useLiveQuery(() => db.products.toArray(), []);

    const searchedProducts = useMemo(() => {
        if (!allProducts) return [];
        
        if (!searchQuery.trim()) {
            // No search query - return all sorted by sales count
            return allProducts
                .sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0))
                .slice(0, 1000); // Limit to 1000 for performance
        }

        // Fuzzy search with very forgiving threshold
        const results = fuzzySearchArray(
            searchQuery,
            allProducts,
            ['name', 'sku', 'barcode'] as any,
            0.4 // Very forgiving threshold
        );

        // Boost by category and sales
        return results.sort((a, b) => {
            // Primary sort by search score
            const scoreDiff = b._searchScore - a._searchScore;
            if (Math.abs(scoreDiff) > 0.1) return scoreDiff;
            
            // Secondary sort by sales count
            return (b.salesCount ?? 0) - (a.salesCount ?? 0);
        });
    }, [allProducts, searchQuery]);

    // Calculate grid columns based on mode
    const gridCols = useMemo(() => {
        if (viewMode === "list") return 1;
        return isTouchMode ? 2 : 3; // 2 cols for touch, 3 for desktop in grid mode
    }, [viewMode, isTouchMode]);

    // For grid mode, we virtualize rows, not individual items
    const virtualItems = useMemo(() => {
        if (!searchedProducts) return [];
        if (viewMode === "list") return searchedProducts;
        
        // Group products into rows for grid view
        const rows: typeof searchedProducts[] = [];
        for (let i = 0; i < searchedProducts.length; i += gridCols) {
            rows.push(searchedProducts.slice(i, i + gridCols));
        }
        return rows;
    }, [searchedProducts, viewMode, gridCols]);

    // Virtual scrolling setup
    const rowVirtualizer = useVirtualizer({
        count: viewMode === "list" ? (searchedProducts?.length ?? 0) : virtualItems.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => (viewMode === "grid" ? 280 : 88), // Estimate card/list item height
        overscan: 5,
    });


    // Customer Search - Local DB
    const searchCustomersResults = useLiveQuery(async () => {
        if (!customerSearchQuery && !showCustomerSearch) return [];

        const lowerQuery = customerSearchQuery.toLowerCase();
        return db.customers
            .filter(c =>
                c.name.toLowerCase().includes(lowerQuery) ||
                (c.email?.toLowerCase().includes(lowerQuery) ?? false) ||
                (c.phone?.includes(lowerQuery) ?? false)
            )
            .limit(10)
            .toArray();
    }, [customerSearchQuery, showCustomerSearch]);

    const createOrder = api.pos.createOrder.useMutation({
        onSuccess: (order) => {
            handleOrderSuccess(order);
        },
        onError: (error) => console.error("Online order creation failed:", error),
    });

    const handleOrderSuccess = async (order: any) => {
        // Update sales count for products
        for (const item of cart) {
            await db.incrementSalesCount(item.productId, item.quantity);
        }

        setLastOrder({
            ...order,
            items: cart.map(c => ({
                quantity: c.quantity,
                price: c.price,
                product: { name: c.name }
            })),
            customer: selectedCustomer,
        });
        setCart([]);
        setSearchQuery("");
        setSelectedCustomer(null);
        setShowPaymentModal(false);
        setShowReceiptModal(true);
    };

    const handleOfflineOrder = async (paymentMethod?: string, amountPaid?: number, clientOrderId = crypto.randomUUID()) => {
        const orderData = {
            clientOrderId,
            shiftId: shiftId ?? undefined,
            customerId: selectedCustomer?.id,
            items: cart.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
            })),
            paymentMethod: (paymentMethod ?? "CASH") as any,
            amountPaid: amountPaid,
        };

        try {
            await db.pendingOrders.add({
                orderData,
                createdAt: new Date(),
                synced: 0
            });

            // Update stock and sales count
            for (const item of cart) {
                const product = await db.products.get(item.productId);
                if (product) {
                    // Only decrement if stock is known (not -1)
                    if (product.stockQuantity !== -1) {
                        await db.products.update(item.productId, {
                            stockQuantity: Math.max(0, product.stockQuantity - item.quantity)
                        });
                    }
                    // Always increment sales count
                    await db.incrementSalesCount(item.productId, item.quantity);
                }
            }

            const fakeOrder = {
                id: `offline-${clientOrderId}`,
                totalAmount: cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toString(),
                paymentMethod: paymentMethod ?? "CASH",
                createdAt: new Date().toISOString(),
                items: [],
                customer: selectedCustomer,
                amountPaid: amountPaid
            };

            handleOrderSuccess(fakeOrder);
        } catch (e) {
            console.error("Failed to save offline order", e);
            alert("Failed to save order offline. Please check your device storage.");
        }
    };

    const addToCart = (product: any) => {
        const existingItem = cart.find((item) => item.productId === product.id);
        if (existingItem) {
            setCart(
                cart.map((item) =>
                    item.productId === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            );
        } else {
            setCart([
                ...cart,
                {
                    productId: product.id,
                    name: product.name,
                    price: Number(product.price),
                    quantity: 1,
                    image: product.image,
                    sku: product.sku,
                },
            ]);
        }
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(
            cart
                .map((item) =>
                    item.productId === productId
                        ? { ...item, quantity: Math.max(0, item.quantity + delta) }
                        : item
                )
                .filter((item) => item.quantity > 0)
        );
    };

    const clearCart = () => {
        if (confirm("Are you sure you want to clear the cart?")) {
            setCart([]);
        }
    };

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handlePaymentConfirm = async (paymentMethod: string, amountPaid: number) => {
        if (cart.length === 0) return;
        const clientOrderId = crypto.randomUUID();

        if (isOnline) {
            createOrder.mutate({
                clientOrderId,
                shiftId: shiftId ?? undefined,
                customerId: selectedCustomer?.id,
                items: cart.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                })),
                paymentMethod: paymentMethod as any,
                amountPaid: amountPaid,
            }, {
                onError: () => handleOfflineOrder(paymentMethod, amountPaid, clientOrderId)
            });
        } else {
            await handleOfflineOrder(paymentMethod, amountPaid, clientOrderId);
        }
    };

    if (!shiftId && isOnline && !currentShift) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg dark:border-gray-800 dark:bg-gray-900">
                    <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
                        No Active Shift
                    </h2>
                    <p className="mb-6 text-gray-600 dark:text-gray-400">
                        You need to open a shift before using the POS terminal.
                    </p>
                    <button
                        onClick={() => router.push("/pos/shifts")}
                        className="rounded-lg bg-[var(--brand-primary-600)] px-6 py-3 font-semibold text-white shadow-lg hover:bg-[var(--brand-primary-700)]"
                    >
                        Manage Shifts
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-gray-50 dark:bg-gray-950 lg:flex-row">
            {/* Left Panel: Product Grid */}
            <div className="flex flex-1 flex-col overflow-hidden border-r border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-950/50">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">POS</h1>
                        <p className="text-xs text-gray-500">
                            {shiftId ? `Shift #${shiftId.slice(0, 8)}` : "Offline Mode"}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Offline Indicator */}
                        <div className="flex items-center gap-2 px-2">
                            {isOnline ? (
                                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400" title="Online">
                                    <Wifi className="h-4 w-4" />
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs text-red-500" title="Offline">
                                    <WifiOff className="h-4 w-4" />
                                </span>
                            )}

                            {pendingOrdersCount > 0 && (
                                <button
                                    onClick={() => pushData()}
                                    disabled={isSyncing || !isOnline}
                                    className={cn(
                                        "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
                                        isSyncing && "animate-pulse"
                                    )}
                                    title={`${pendingOrdersCount} pending orders`}
                                >
                                    <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
                                    {pendingOrdersCount}
                                </button>
                            )}
                        </div>

                        {/* View Mode Toggle */}
                        <button
                            onClick={toggleViewMode}
                            className={cn(
                                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                            )}
                            title={viewMode === "grid" ? "Switch to List View" : "Switch to Grid View"}
                        >
                            {viewMode === "grid" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                            <span className="hidden sm:inline">{viewMode === "grid" ? "List" : "Grid"}</span>
                        </button>

                        <button
                            onClick={toggleTouchMode}
                            className={cn(
                                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                isTouchMode
                                    ? "bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)] dark:bg-[var(--brand-primary-900)]/20 dark:text-[var(--brand-primary-400)]"
                                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                            )}
                            title={isTouchMode ? "Switch to Desktop Mode" : "Switch to Touch Mode"}
                        >
                            {isTouchMode ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                            <span className="hidden sm:inline">{isTouchMode ? "Touch" : "Desktop"}</span>
                        </button>
                        <ThemeToggle />
                        <button
                            onClick={() => router.push("/pos/shifts")}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                            Shifts
                        </button>
                    </div>
                </div>

                {/* Search & Filter */}
                <div className="p-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search products by name, SKU, or barcode..."
                            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-lg shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-focus)]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Products Grid/List with Virtual Scrolling */}
                <div ref={parentRef} className="flex-1 overflow-y-auto p-4 pt-0">
                    <ErrorBoundary
                        componentName="POSProductGrid"
                        fallback={<ComponentErrorFallback title="Grid Error" message="Failed to load product grid" />}
                    >
                        {!searchedProducts ? (
                            <div className="flex h-full items-center justify-center">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--brand-primary-600)]"></div>
                            </div>
                        ) : viewMode === "grid" ? (
                            <div
                                style={{
                                    height: `${rowVirtualizer.getTotalSize()}px`,
                                    width: '100%',
                                    position: 'relative'
                                }}
                            >
                                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                    const rowProducts = virtualItems[virtualRow.index] as typeof searchedProducts;
                                    if (!rowProducts) return null;
                                    
                                    return (
                                        <div
                                            key={virtualRow.key}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: `${virtualRow.size}px`,
                                                transform: `translateY(${virtualRow.start}px)`
                                            }}
                                        >
                                            <div className={cn(
                                                "grid gap-4 h-full",
                                                gridCols === 2 ? "grid-cols-2" : "grid-cols-3"
                                            )}>
                                                {rowProducts.map((product) => (
                                                    <ProductCard
                                                        key={product.id}
                                                        product={{
                                                            ...product,
                                                            price: Number(product.price),
                                                            image: product.image ?? null
                                                        }}
                                                        onClick={() => addToCart(product)}
                                                        touchMode={isTouchMode}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div
                                style={{
                                    height: `${rowVirtualizer.getTotalSize()}px`,
                                    width: '100%',
                                    position: 'relative'
                                }}
                            >
                                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                    const product = searchedProducts[virtualRow.index];
                                    if (!product) return null;
                                    
                                    return (
                                        <div
                                            key={virtualRow.key}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: `${virtualRow.size}px`,
                                                transform: `translateY(${virtualRow.start}px)`
                                            }}
                                        >
                                            <ProductListItem
                                                product={{
                                                    ...product,
                                                    price: Number(product.price),
                                                    image: product.image ?? null
                                                }}
                                                onClick={() => addToCart(product)}
                                                className="mb-2"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {searchedProducts?.length === 0 && (
                            <div className="flex h-64 items-center justify-center text-gray-500">
                                No products found
                            </div>
                        )}
                    </ErrorBoundary>
                </div>
            </div>

            {/* Right Panel: Cart */}
            <div className={cn(
                "flex flex-col bg-white shadow-xl dark:bg-gray-900 transition-all duration-300",
                isTouchMode ? "w-full lg:w-[450px]" : "w-full lg:w-[400px]"
            )}>
                {/* Customer Selection */}
                <div className="border-b border-gray-200 p-4 dark:border-gray-800">
                    <ErrorBoundary
                        componentName="POSCustomerSelection"
                        fallback={<ComponentErrorFallback title="Customer Error" message="Failed to load customer selector" />}
                    >
                        <div className="relative">
                            <button
                                onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                            >
                                <div className="flex items-center gap-3">
                                    {selectedCustomer ? (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary-100)] text-[var(--brand-primary-700)] dark:bg-[var(--brand-primary-900)]/30 dark:text-[var(--brand-primary-400)]">
                                            <User className="h-5 w-5" />
                                        </div>
                                    ) : (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-500 dark:bg-gray-700">
                                            <UserX className="h-5 w-5" />
                                        </div>
                                    )}
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {selectedCustomer ? selectedCustomer.name : "Add Customer"}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {selectedCustomer ? "Loyalty Customer" : "Guest Customer"}
                                        </p>
                                    </div>
                                </div>
                                {selectedCustomer && (
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedCustomer(null);
                                        }}
                                        className="rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-600"
                                    >
                                        <X className="h-4 w-4 text-gray-500" />
                                    </div>
                                )}
                            </button>

                            {showCustomerSearch && (
                                <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
                                    <div className="p-3">
                                        <input
                                            type="text"
                                            value={customerSearchQuery}
                                            onChange={(e) => setCustomerSearchQuery(e.target.value)}
                                            placeholder="Search customer name/email..."
                                            className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-[var(--brand-primary-500)] focus:outline-none dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {searchCustomersResults?.map((customer) => (
                                            <button
                                                key={customer.id}
                                                onClick={() => {
                                                    setSelectedCustomer({
                                                        ...customer,
                                                        email: customer.email ?? null
                                                    });
                                                    setShowCustomerSearch(false);
                                                    setCustomerSearchQuery("");
                                                }}
                                                className="w-full border-t border-gray-100 px-4 py-3 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                                            >
                                                <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                                                <p className="text-xs text-gray-500">{customer.email}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </ErrorBoundary>
                </div>

                {/* Cart List */}
                <div className="flex-1 overflow-y-auto p-4">
                    <ErrorBoundary
                        componentName="POSCartList"
                        fallback={<ComponentErrorFallback title="Cart Error" message="Failed to load cart items" />}
                    >
                        {cart.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-gray-400">
                                <ShoppingCart className="mb-4 h-16 w-16 opacity-20" />
                                <p>Cart is empty</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="mb-2 flex justify-end">
                                    <button
                                        onClick={clearCart}
                                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 hover:underline"
                                    >
                                        <Trash2 className="h-3 w-3" /> Clear All
                                    </button>
                                </div>
                                {cart.map((item) => (
                                    <div
                                        key={item.productId}
                                        className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-800/50"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                                            <p className="text-sm text-gray-500">{formatCurrency(item.price)}</p>
                                        </div>
                                        <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-1 dark:text-white dark:bg-gray-800">
                                            <button
                                                onClick={() => updateQuantity(item.productId, -1)}
                                                className="rounded-md p-1 hover:bg-white hover:shadow-sm dark:hover:bg-gray-700"
                                            >
                                                <Minus className="h-4 w-4" />
                                            </button>
                                            <span className="w-8 text-center font-semibold">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.productId, 1)}
                                                className="rounded-md p-1 hover:bg-white hover:shadow-sm dark:hover:bg-gray-700"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ErrorBoundary>
                </div>

                {/* Totals & Checkout */}
                <div className="border-t border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900/50">
                    <ErrorBoundary
                        componentName="POSTotals"
                        fallback={<ComponentErrorFallback title="Checkout Error" message="Failed to load checkout totals" />}
                    >
                        <div className="mb-6 space-y-2">
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Subtotal</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Tax</span>
                                <span>{formatCurrency(0)}</span>
                            </div>
                            <div className="flex justify-between text-2xl font-bold text-gray-900 dark:text-white">
                                <span>Total</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowPaymentModal(true)}
                            disabled={cart.length === 0}
                            className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)] py-4 text-lg font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                        >
                            <span>Pay {formatCurrency(total)}</span>
                        </button>
                    </ErrorBoundary>
                </div>
            </div>

            {/* Modals */}
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                totalAmount={total}
                onConfirm={handlePaymentConfirm}
                isProcessing={createOrder.isPending}
            />

            {lastOrder && (
                <ReceiptModal
                    isOpen={showReceiptModal}
                    onClose={() => setShowReceiptModal(false)}
                    order={{
                        id: lastOrder.id,
                        totalAmount: parseFloat(lastOrder.totalAmount),
                        paymentMethod: lastOrder.paymentMethod,
                        createdAt: new Date(lastOrder.createdAt),
                        items: lastOrder.items,
                        customer: lastOrder.customer,
                        amountPaid: lastOrder.amountPaid,
                        change: lastOrder.amountPaid ? lastOrder.amountPaid - parseFloat(lastOrder.totalAmount) : 0,
                    }}
                />
            )}
        </div>
    );
}
