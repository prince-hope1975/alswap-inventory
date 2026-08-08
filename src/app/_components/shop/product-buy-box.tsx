"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";

import { CartProvider, useCart } from "./cart-context";
import { CheckoutModal } from "./checkout-modal";
import { trackStorefrontEvent } from "~/components/analytics-consent";

type BuyBoxProduct = {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  stockQuantity: number | null;
};

function BuyBoxInner({ product }: { product: BuyBoxProduct }) {
  const { addItem, updateQuantity, setIsCartOpen } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [added, setAdded] = useState(false);

  // stockQuantity of -1 means "unknown" in this schema, so only an explicit 0
  // is out of stock.
  const isOutOfStock = product.stockQuantity === 0;

  const putInCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    });
    // addItem always starts at 1 and opens the cart drawer, which this page
    // does not render — set the real quantity and close it again.
    if (quantity > 1) updateQuantity(product.id, quantity);
    setIsCartOpen(false);
    trackStorefrontEvent("add_to_cart", {
      item_id: product.id,
      item_name: product.name,
      quantity,
      value: product.price * quantity,
      currency: "NGN",
    });
  };

  if (isOutOfStock) {
    return (
      <div className="mt-8 rounded-2xl border border-stone-300 bg-white p-5">
        <p className="font-bold">Out of stock</p>
        <p className="mt-1 text-sm text-stone-600">
          Contact the store to check when this item is back in.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-full border border-stone-300 bg-white">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="grid h-12 w-12 place-items-center rounded-l-full focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none"
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-10 text-center font-black" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="grid h-12 w-12 place-items-center rounded-r-full focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none"
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            putInCart();
            setAdded(true);
          }}
          className="inline-flex min-h-14 items-center gap-3 rounded-full border border-stone-950 px-7 font-black focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none"
        >
          <ShoppingCart className="h-5 w-5" /> Add to cart
        </button>

        <button
          type="button"
          onClick={() => {
            putInCart();
            trackStorefrontEvent("begin_checkout", {
              item_id: product.id,
              quantity,
              value: product.price * quantity,
              currency: "NGN",
            });
            setIsCheckoutOpen(true);
          }}
          className="inline-flex min-h-14 items-center gap-3 rounded-full bg-stone-950 px-7 font-black text-white focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none"
        >
          Buy now
        </button>
      </div>

      {added && (
        <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-green-700">
          <Check className="h-4 w-4" /> Added to cart.{" "}
          <Link href="/shop" className="underline">
            Keep shopping
          </Link>
        </p>
      )}

      {isCheckoutOpen && (
        <CheckoutModal onClose={() => setIsCheckoutOpen(false)} />
      )}
    </div>
  );
}

/**
 * Buy controls for the product detail page.
 *
 * The page is a server component outside the storefront's CartProvider, so the
 * provider is mounted here. The cart is persisted to localStorage, so items
 * added here are the same cart the storefront and checkout see.
 */
export function ProductBuyBox({ product }: { product: BuyBoxProduct }) {
  return (
    <CartProvider>
      <BuyBoxInner product={product} />
    </CartProvider>
  );
}
