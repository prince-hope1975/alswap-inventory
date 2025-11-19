"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { Search, ShoppingCart, X, Plus, Minus, User, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { ThemeToggle } from "~/components/theme-toggle";

type CartItem = {
    productId: string;
    name: string;
    price: number;
    quantity: number;
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

    const { data: currentShift } = api.pos.getCurrentShift.useQuery();
    const searchProducts = api.pos.searchProducts.useQuery(
        { query: searchQuery },
        { enabled: searchQuery.length > 0 }
    );
    const searchCustomers = api.pos.searchCustomers.useQuery(
        { query: customerSearchQuery },
        { enabled: customerSearchQuery.length > 0 && showCustomerSearch }
    );
    const createOrder = api.pos.createOrder.useMutation({
        onSuccess: (order) => {
            setCart([]);
            setSearchQuery("");
            setSelectedCustomer(null);
            // Open receipt in a new window
            window.open(`/pos/receipt/${order.id}`, "_blank", "width=400,height=600");
        },
    });

    useEffect(() => {
        if (currentShift) {
            setShiftId(currentShift.id);
        }
    }, [currentShift]);

    const addToCart = (product: { id: string; name: string; price: string }) => {
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
                },
            ]);
        }
        setSearchQuery("");
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

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handleCheckout = () => {
        if (cart.length === 0) return;

        createOrder.mutate({
            shiftId: shiftId ?? undefined,
            customerId: selectedCustomer?.id,
            items: cart.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
            })),
            paymentMethod: "CASH",
        });
    };

    if (!currentShift) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
                <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
                        No Active Shift
                    </h2>
                    <p className="mb-6 text-gray-600 dark:text-gray-400">
                        You need to open a shift before using the POS terminal.
                    </p>
                    <button
                        onClick={() => router.push("/pos/shifts")}
                        className="rounded-lg bg-gradient-to-r from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)] px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                    >
                        Manage Shifts
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
            <div className="flex flex-1 flex-col p-6">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            POS Terminal
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Shift #{currentShift.id.slice(0, 8)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button
                            onClick={() => router.push("/pos/shifts")}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                            Manage Shifts
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search products by name, SKU, or barcode..."
                        className="w-full rounded-xl border border-gray-200 bg-white py-4 pl-12 pr-4 text-lg shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-focus)]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                    {searchProducts.data && searchProducts.data.length > 0 && (
                        <div className="absolute z-10 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                            {searchProducts.data.map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className="flex w-full items-center justify-between border-b border-gray-100 p-4 text-left transition-colors hover:bg-gray-50 last:border-0 dark:border-gray-700 dark:hover:bg-gray-700"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {product.name}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {product.barcode ?? product.sku}
                                        </p>
                                    </div>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(product.price)}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Cart Items */}
                <div className="flex-1 space-y-3 overflow-y-auto">
                    {cart.length === 0 ? (
                        <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
                            <div className="text-center">
                                <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                                <p className="mt-2 text-gray-500 dark:text-gray-400">
                                    Cart is empty
                                </p>
                            </div>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div
                                key={item.productId}
                                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                            >
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {item.name}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {formatCurrency(item.price)} each
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => updateQuantity(item.productId, -1)}
                                        className="rounded-lg bg-gray-100 p-2 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                                    >
                                        <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="w-8 text-center font-semibold">
                                        {item.quantity}
                                    </span>
                                    <button
                                        onClick={() => updateQuantity(item.productId, 1)}
                                        className="rounded-lg bg-gray-100 p-2 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => removeFromCart(item.productId)}
                                        className="ml-2 rounded-lg bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Checkout Sidebar */}
            <div className="w-96 border-l border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-white">
                    Order Summary
                </h2>

                <div className="mb-6 space-y-2">
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Subtotal</span>
                        <span>{formatCurrency(total)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Tax (0%)</span>
                        <span>{formatCurrency(0)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 dark:border-gray-700">
                        <div className="flex justify-between text-2xl font-bold text-gray-900 dark:text-white">
                            <span>Total</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleCheckout}
                    disabled={cart.length === 0 || createOrder.isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)] py-4 text-lg font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                    <span className="text-xl font-bold">{currency}</span>
                    {createOrder.isPending ? "Processing..." : "Complete Sale"}
                </button>

                <div className="mt-4 space-y-2">
                    <div className="relative">
                        <button
                            onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            {selectedCustomer ? (
                                <>
                                    <User className="h-4 w-4" />
                                    {selectedCustomer.name}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedCustomer(null);
                                            setShowCustomerSearch(false);
                                        }}
                                        className="ml-auto rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-600"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <UserX className="h-4 w-4" />
                                    Add Customer
                                </>
                            )}
                        </button>
                        {showCustomerSearch && (
                            <div className="absolute bottom-full left-0 right-0 z-10 mb-2 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                                <div className="p-2">
                                    <input
                                        type="text"
                                        value={customerSearchQuery}
                                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                                        placeholder="Search customers..."
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--brand-primary-500)] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                        autoFocus
                                    />
                                </div>
                                {searchCustomers.data && searchCustomers.data.length > 0 && (
                                    <div className="max-h-48 overflow-y-auto">
                                        {searchCustomers.data.map((customer) => (
                                            <button
                                                key={customer.id}
                                                onClick={() => {
                                                    setSelectedCustomer({
                                                        id: customer.id,
                                                        name: customer.name,
                                                        email: customer.email,
                                                    });
                                                    setShowCustomerSearch(false);
                                                    setCustomerSearchQuery("");
                                                }}
                                                className="flex w-full items-center gap-3 border-b border-gray-100 p-3 text-left transition-colors hover:bg-gray-50 last:border-0 dark:border-gray-700 dark:hover:bg-gray-700"
                                            >
                                                <User className="h-4 w-4 text-gray-400" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {customer.name}
                                                    </p>
                                                    {customer.email && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {customer.email}
                                                        </p>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <button className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                        Apply Discount
                    </button>
                </div>
            </div>
        </div>
    );
}
