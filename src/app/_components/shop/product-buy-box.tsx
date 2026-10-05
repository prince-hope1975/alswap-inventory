"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";

import { useCart } from "./cart-context";
import { CheckoutModal } from "./checkout-modal";
import { trackStorefrontEvent } from "~/components/analytics-consent";
import { capQuantity, maxCartQuantity } from "~/lib/domain/checkout";

type BuyBoxProduct = {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  stockQuantity: number | null;
};

/**
 * Buy controls for the product detail page. Must render inside the page's
 * CartProvider (see `ProductPageShell`) so the navbar badge and drawer see
 * the same cart.
 */
export function ProductBuyBox({ product }: { product: BuyBoxProduct }) {
  const { addItem, items, setIsCartOpen } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // stockQuantity of -1 means "untracked" in this schema, so only an explicit
  // 0 is out of stock.
  const isOutOfStock = product.stockQuantity === 0;
  const inCart =
    items.find((item) => item.productId === product.id)?.quantity ?? 0;
  const max = maxCartQuantity(product.stockQuantity);
  // How many more the shopper can still add on top of what's in the cart.
  const remaining = max == null ? null : Math.max(0, max - inCart);
  const canAdd = remaining == null || remaining > 0;
  const qty = Math.max(1, capQuantity(quantity, remaining ?? undefined));

  const putInCart = (opts: { silent?: boolean }) => {
    addItem(
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        stockQuantity: product.stockQuantity,
      },
      qty,
      { openCart: false, silent: opts.silent },
    );
    trackStorefrontEvent("add_to_cart", {
      item_id: product.id,
      item_name: product.name,
      quantity: qty,
      value: product.price * qty,
      currency: "NGN",
    });
    setQuantity(1);
  };

  if (isOutOfStock) {
    return (
      <div className="mt-8 rounded-2xl border border-stone-300 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <p className="font-bold">Out of stock</p>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Contact the store to check when this item is back in.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-full border border-stone-300 bg-white dark:border-white/15 dark:bg-white/5">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, qty - 1))}
            disabled={qty <= 1}
            className="grid h-12 w-12 place-items-center rounded-l-full focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none disabled:opacity-40"
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-10 text-center font-black" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(qty + 1)}
            disabled={remaining != null && qty >= remaining}
            className="grid h-12 w-12 place-items-center rounded-r-full focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none disabled:opacity-40"
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          disabled={!canAdd}
          onClick={() => putInCart({})}
          className="inline-flex min-h-14 items-center gap-3 rounded-full border border-stone-950 px-7 font-black focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 dark:border-white"
        >
          <ShoppingCart className="h-5 w-5" /> Add to cart
        </button>

        <button
          type="button"
          onClick={() => {
            // Buy now adds to whatever is already in the cart, then checks out.
            if (canAdd) putInCart({ silent: true });
            trackStorefrontEvent("begin_checkout", {
              item_id: product.id,
              quantity: qty,
              value: product.price * qty,
              currency: "NGN",
            });
            setIsCheckoutOpen(true);
          }}
          className="inline-flex min-h-14 items-center gap-3 rounded-full bg-stone-950 px-7 font-black text-white focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none dark:bg-white dark:text-stone-950"
        >
          Buy now
        </button>
      </div>

      {inCart > 0 && (
        <p className="mt-4 text-sm font-bold text-green-700 dark:text-green-400">
          {inCart} in your cart.{" "}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="min-h-11 underline underline-offset-4"
          >
            View cart
          </button>
          {!canAdd && " That's all we have in stock."}
        </p>
      )}

      {isCheckoutOpen && (
        <CheckoutModal onClose={() => setIsCheckoutOpen(false)} />
      )}
    </div>
  );
}
