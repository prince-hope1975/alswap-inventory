"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { Search, ShoppingCart, X, Plus, Minus, User, UserX, LayoutGrid, List, Smartphone, Monitor, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { ThemeToggle } from "~/components/theme-toggle";
import { ProductCard } from "../_components/pos/product-card";
import { PaymentModal } from "../_components/pos/payment-modal";
import { ReceiptModal } from "../_components/pos/receipt-modal";
import { cn } from "~/lib/utils";

type CartItem = {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image: string | null;
    sku?: string | null;
};

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
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [lastOrder, setLastOrder] = useState<any>(null);

    // Detect touch device or load preference
    useEffect(() => {
        const stored = localStorage.getItem("pos_touch_mode");
        if (stored) {
            setIsTouchMode(stored === "true");
        } else {
            // Simple heuristic for touch device
            const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            setIsTouchMode(isTouch);
            localStorage.setItem("pos_touch_mode", String(isTouch));
        }
    }, []);

    const toggleTouchMode = () => {
        const newValue = !isTouchMode;
        setIsTouchMode(newValue);
        localStorage.setItem("pos_touch_mode", String(newValue));
    };

    const { data: currentShift } = api.pos.getCurrentShift.useQuery();

    // In touch mode, we might want to show all products if query is empty, but for performance we might stick to search
    // Or maybe fetch a default list of popular items? 
    // For now, sticking to search behavior but maybe default to empty query returning top items if backend supports it (my backend code does strict ILIKE matching, so empty string matches everything with %%)
    // Wait, `%${input.query}%` with empty string `""` becomes `%%` which matches all.
    // But I put `enabled: searchQuery.length > 0` in the original code.
    // I will change it to always fetch if we want a grid to be populated initially.
    // Let's allow fetching all products (limit 20) if query is empty.
    const searchProducts = api.pos.searchProducts.useQuery(
        { query: searchQuery },
        // @ts-ignore - TRPC/Tanstack Query v5 compatibility
        { placeholderData: (prev) => prev }
    );

    const searchCustomers = api.pos.searchCustomers.useQuery(
        { query: customerSearchQuery },
        { enabled: customerSearchQuery.length > 0 && showCustomerSearch }
    );

    const createOrder = api.pos.createOrder.useMutation({
        onSuccess: (order) => {
            setLastOrder({
                ...order,
                items: cart.map(c => ({
                    quantity: c.quantity,
                    price: c.price,
                    product: { name: c.name }
                })),
                customer: selectedCustomer,
                // Calculate change/paid locally for receipt as server doesn't return it in the order object yet (except if I query it back)
                // But the modal will have the details.
            });
            setCart([]);
            setSearchQuery("");
            setSelectedCustomer(null);
            setShowPaymentModal(false);
            setShowReceiptModal(true);
        },
    });

    useEffect(() => {
        if (currentShift) {
            setShiftId(currentShift.id);
        }
    }, [currentShift]);

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
        // Don't clear search query in grid mode, annoying
        if (!isTouchMode) {
            setSearchQuery("");
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

    const removeFromCart = (productId: string) => {
        setCart(cart.filter((item) => item.productId !== productId));
    };

    const clearCart = () => {
        if (confirm("Are you sure you want to clear the cart?")) {
            setCart([]);
        }
    };

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handlePaymentConfirm = (paymentMethod: string, amountPaid: number) => {
        if (cart.length === 0) return;

        createOrder.mutate({
            shiftId: shiftId ?? undefined,
            customerId: selectedCustomer?.id,
            items: cart.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
            })),
            paymentMethod: paymentMethod as any,
            amountPaid: amountPaid,
        });
    };

    if (!currentShift) {
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
                        <p className="text-xs text-gray-500">Shift #{currentShift.id.slice(0, 8)}</p>
                    </div>
                    <div className="flex items-center gap-3">
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
                            placeholder="Search products..."
                            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-lg shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-focus)]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                    </div>
                </div>

                {/* Products Grid */}
                <div className="flex-1 overflow-y-auto p-4 pt-0">
                    {searchProducts.isLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--brand-primary-600)]"></div>
                        </div>
                    ) : (
                        <div className={cn(
                            "grid gap-4",
                            isTouchMode ? "grid-cols-3 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                        )}>
                            {searchProducts.data?.map((product) => (
                                <div key={product.id} className="h-64">
                                    <ProductCard
                                        product={{
                                            ...product,
                                            price: Number(product.price)
                                        }}
                                        onClick={() => addToCart(product)}
                                    />
                                </div>
                            ))}
                            {searchProducts.data?.length === 0 && (
                                <div className="col-span-full flex h-64 items-center justify-center text-gray-500">
                                    No products found
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel: Cart */}
            <div className={cn(
                "flex flex-col bg-white shadow-xl dark:bg-gray-900 transition-all duration-300",
                isTouchMode ? "w-full lg:w-[450px]" : "w-full lg:w-[400px]"
            )}>
                {/* Customer Selection */}
                <div className="border-b border-gray-200 p-4 dark:border-gray-800">
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
                                    {searchCustomers.data?.map((customer) => (
                                        <button
                                            key={customer.id}
                                            onClick={() => {
                                                setSelectedCustomer(customer);
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
                </div>

                {/* Cart List */}
                <div className="flex-1 overflow-y-auto p-4">
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
                </div>

                {/* Totals & Checkout */}
                <div className="border-t border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900/50">
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
