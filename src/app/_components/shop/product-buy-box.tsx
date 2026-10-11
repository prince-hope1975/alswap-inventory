"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Minus, Plus, ShoppingCart } from "lucide-react";

import { useCart } from "./cart-context";
import { CheckoutModal } from "./checkout-modal";
import { trackStorefrontEvent } from "~/components/analytics-consent";
import {
  PRICE_ON_REQUEST_LABEL,
  capQuantity,
  formatMoney,
  isPriceOnRequest,
  maxCartQuantity,
  whatsAppUrl,
} from "~/lib/domain/checkout";

type BuyBoxProduct = {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  stockQuantity: number | null;
};

const focusRing =
  "focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-[#0a1117]";

/**
 * Buy controls for the product detail page. Must render inside the page's
 * CartProvider (see `ProductPageShell`) so the navbar badge and drawer see
 * the same cart.
 *
 * On phones a sticky bar ("price · Add to cart") takes over once the main
 * buttons scroll out of view.
 */
export function ProductBuyBox({
  product,
  currency,
  storePhone,
}: {
  product: BuyBoxProduct;
  currency?: string | null;
  /** WhatsApp number for "Ask for a price" when the item has no price. */
  storePhone?: string | null;
}) {
  const { addItem, items, setIsCartOpen } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [mainVisible, setMainVisible] = useState(true);
  const mainRef = useRef<HTMLDivElement>(null);

  // stockQuantity of -1 means "untracked" in this schema, so only an explicit
  // 0 is out of stock.
  const isOutOfStock = product.stockQuantity === 0;
  const onRequest = isPriceOnRequest(product.price);
  const inCart =
    items.find((item) => item.productId === product.id)?.quantity ?? 0;
  const max = maxCartQuantity(product.stockQuantity);
  // How many more the shopper can still add on top of what's in the cart.
  const remaining = max == null ? null : Math.max(0, max - inCart);
  const canAdd = remaining == null || remaining > 0;
  const qty = Math.max(1, capQuantity(quantity, remaining ?? undefined));
  const money = (value: number) => formatMoney(value, currency);

  useEffect(() => {
    const node = mainRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setMainVisible(entry?.isIntersecting ?? true),
      // The fixed navbar covers the top 64px.
      { rootMargin: "-64px 0px 0px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isOutOfStock, onRequest]);

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

  const buyNow = () => {
    // Buy now adds to whatever is already in the cart, then checks out.
    if (canAdd) putInCart({ silent: true });
    trackStorefrontEvent("begin_checkout", {
      item_id: product.id,
      quantity: qty,
      value: product.price * qty,
      currency: "NGN",
    });
    setIsCheckoutOpen(true);
  };

  if (onRequest || isOutOfStock) {
    const askText = onRequest
      ? `Hello, what is the price of ${product.name}?`
      : `Hello, when will ${product.name} be back in stock?`;
    return (
      <div className="mt-6 rounded-2xl border border-stone-300 bg-white p-5 sm:mt-8 dark:border-white/10 dark:bg-[#0f1a22]">
        <p className="font-bold">{onRequest ? PRICE_ON_REQUEST_LABEL : "Out of stock"}</p>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          {onRequest
            ? "This item isn't priced online yet. Message the store for a quote."
            : "Contact the store to check when this item is back in."}
        </p>
        {storePhone && (
          <a
            href={whatsAppUrl(storePhone, askText)}
            target="_blank"
            rel="noreferrer"
            className={`mt-4 inline-flex min-h-12 items-center gap-2 rounded-full bg-green-700 px-6 font-bold text-white hover:bg-green-600 ${focusRing}`}
          >
            <MessageCircle className="h-5 w-5" aria-hidden />
            {onRequest ? "Ask for a price" : "Ask the store"}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 sm:mt-8">
      <div ref={mainRef} className="space-y-3">
        <div className="flex items-center gap-3">
          <span id="buy-qty-label" className="text-sm font-bold text-stone-600 dark:text-stone-300">
            Quantity
          </span>
          <div
            role="group"
            aria-labelledby="buy-qty-label"
            className="inline-flex items-center rounded-full border border-stone-300 bg-white dark:border-white/15 dark:bg-white/5"
          >
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, qty - 1))}
              disabled={qty <= 1}
              className={`grid h-11 w-11 place-items-center rounded-l-full disabled:opacity-40 ${focusRing}`}
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" aria-hidden />
            </button>
            <span className="min-w-10 text-center font-black" aria-live="polite">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(qty + 1)}
              disabled={remaining != null && qty >= remaining}
              className={`grid h-11 w-11 place-items-center rounded-r-full disabled:opacity-40 ${focusRing}`}
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          <button
            type="button"
            disabled={!canAdd}
            onClick={() => putInCart({})}
            className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#f5a623] px-5 font-black text-[#14212b] hover:bg-[#ffc04d] disabled:cursor-not-allowed disabled:opacity-40 sm:px-7 ${focusRing}`}
          >
            <ShoppingCart className="h-5 w-5" aria-hidden /> Add to cart
          </button>
          <button
            type="button"
            onClick={buyNow}
            className={`inline-flex min-h-14 items-center justify-center rounded-full bg-stone-950 px-5 font-black text-white hover:bg-stone-800 sm:px-7 dark:bg-white dark:text-stone-950 dark:hover:bg-stone-200 ${focusRing}`}
          >
            Buy now
          </button>
        </div>
      </div>

      {inCart > 0 && (
        <p className="mt-4 text-sm font-bold text-green-700 dark:text-green-400">
          {inCart} in your cart.{" "}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className={`min-h-11 rounded underline underline-offset-4 ${focusRing}`}
          >
            View cart
          </button>
          {!canAdd && " That's all we have in stock."}
        </p>
      )}

      {/* Phone sticky bar: price stays one tap from the cart. */}
      <div
        aria-hidden={mainVisible}
        inert={mainVisible}
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-stone-300 bg-[#f3f0e8]/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md transition-transform duration-200 sm:hidden dark:border-white/10 dark:bg-[#0a1117]/95 ${
          mainVisible ? "translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-stone-600 dark:text-stone-400">{product.name}</p>
            <p className="text-lg leading-tight font-black">{money(product.price)}</p>
          </div>
          <button
            type="button"
            disabled={!canAdd}
            onClick={() => putInCart({})}
            className={`inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-[#f5a623] px-5 font-black text-[#14212b] disabled:opacity-40 ${focusRing}`}
          >
            <ShoppingCart className="h-5 w-5" aria-hidden /> Add to cart
          </button>
        </div>
      </div>

      {isCheckoutOpen && (
        <CheckoutModal onClose={() => setIsCheckoutOpen(false)} />
      )}
    </div>
  );
}
