"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

import { addCartItem, capQuantity, type CartLine } from "~/lib/domain/checkout";
import { toast } from "~/lib/toast";

export type CartItem = CartLine;

type CartContextType = {
    items: CartItem[];
    /**
     * Add `quantity` (default 1) of a product, merging with an existing line
     * and capping at `stockQuantity` when the store tracks it.
     */
    addItem: (
        item: Omit<CartItem, "quantity">,
        quantity?: number,
        options?: { openCart?: boolean; silent?: boolean },
    ) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    totalItems: number;
    totalAmount: number;
    isCartOpen: boolean;
    setIsCartOpen: (isOpen: boolean) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from local storage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem("alswap-cart");
        if (savedCart) {
            try {
                setItems(JSON.parse(savedCart) as CartItem[]);
            } catch (e) {
                console.error("Failed to parse cart", e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Save to local storage on change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem("alswap-cart", JSON.stringify(items));
        }
    }, [items, isLoaded]);

    const addItem: CartContextType["addItem"] = (newItem, quantity = 1, options = {}) => {
        // Compute against the current snapshot so the toast reflects what
        // actually went in; the functional update keeps rapid clicks correct.
        const preview = addCartItem(items, newItem, quantity);
        setItems((prev) => addCartItem(prev, newItem, quantity).lines);

        if (!options.silent) {
            if (preview.added === 0) {
                toast.warning(`No more ${newItem.name} in stock.`);
            } else if (preview.capped) {
                toast.info(`Only ${preview.added} more ${newItem.name} available; added ${preview.added}.`);
            } else {
                toast.success(
                    preview.added > 1
                        ? `Added ${preview.added} × ${newItem.name} to cart`
                        : `Added ${newItem.name} to cart`,
                );
            }
        }
        if (options.openCart ?? true) setIsCartOpen(true);
    };

    const removeItem = (productId: string) => {
        setItems((prev) => prev.filter((item) => item.productId !== productId));
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity < 1) {
            removeItem(productId);
            return;
        }
        setItems((prev) =>
            prev.map((item) =>
                item.productId === productId
                    ? { ...item, quantity: Math.max(1, capQuantity(quantity, item.stockQuantity)) }
                    : item
            )
        );
    };

    const clearCart = () => {
        setItems([]);
    };

    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
    const totalAmount = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

    return (
        <CartContext.Provider
            value={{
                items,
                addItem,
                removeItem,
                updateQuantity,
                clearCart,
                totalItems,
                totalAmount,
                isCartOpen,
                setIsCartOpen,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
