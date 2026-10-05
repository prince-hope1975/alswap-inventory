"use client";

import { useRef } from "react";
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";

import { useCart } from "./cart-context";
import { StorefrontImage } from "./storefront-image";
import { useShopCurrency } from "~/hooks/use-tenant-settings";
import { maxCartQuantity } from "~/lib/domain/checkout";
import { useDialogA11y } from "~/hooks/use-dialog-a11y";

/**
 * Slide-over cart shared by the storefront and the product page. Follows the
 * page theme (light/dark) rather than a fixed navy panel.
 */
export function CartDrawer({ onCheckout }: { onCheckout: () => void }) {
  const {
    items,
    totalItems,
    totalAmount,
    isCartOpen,
    setIsCartOpen,
    removeItem,
    updateQuantity,
  } = useCart();
  const { formatCurrency } = useShopCurrency();

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useDialogA11y({
    open: isCartOpen,
    onClose: () => setIsCartOpen(false),
    panelRef,
    initialFocusRef: closeRef,
  });

  if (!isCartOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        tabIndex={-1}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-gray-200 bg-white font-sans text-gray-900 shadow-2xl focus:outline-none dark:border-white/10 dark:bg-[#0f1a22] dark:text-white"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-white/10">
            <h2 id="cart-drawer-title" className="text-xl font-bold">
              Your cart ({totalItems})
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setIsCartOpen(false)}
              aria-label="Close cart"
              className="grid h-11 w-11 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-[#167da8] focus-visible:outline-none dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <ShoppingCart className="mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" />
                <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
                  Your cart is empty
                </p>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="mt-4 min-h-11 rounded-full bg-gray-100 px-6 text-sm font-semibold text-gray-900 hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-[#167da8] focus-visible:outline-none dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                >
                  Start shopping
                </button>
              </div>
            ) : (
              <ul className="space-y-5">
                {items.map((item) => {
                  const max = maxCartQuantity(item.stockQuantity);
                  const atMax = max != null && item.quantity >= max;
                  return (
                    <li key={item.productId} className="flex gap-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-white/5">
                        {item.image ? (
                          <StorefrontImage
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="5rem"
                            className="object-contain p-1"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ShoppingCart className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="line-clamp-2 font-medium">{item.name}</h3>
                            <p className="text-sm text-[#0b6e99] dark:text-[#8dc5dc]">
                              {formatCurrency(item.price)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.productId)}
                            aria-label={`Remove ${item.name} from cart`}
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="inline-flex items-center rounded-full border border-gray-200 dark:border-white/15">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              aria-label={
                                item.quantity <= 1
                                  ? `Remove ${item.name} from cart`
                                  : `Decrease ${item.name} quantity`
                              }
                              className="grid h-11 w-11 place-items-center rounded-l-full hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[#167da8] focus-visible:outline-none dark:hover:bg-white/10"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span
                              className="min-w-8 text-center text-sm font-semibold"
                              aria-live="polite"
                              aria-label={`Quantity ${item.quantity}`}
                            >
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              disabled={atMax}
                              aria-label={`Increase ${item.name} quantity`}
                              className="grid h-11 w-11 place-items-center rounded-r-full hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[#167da8] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          {atMax && (
                            <span className="text-xs text-amber-700 dark:text-amber-400">
                              Max in stock
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t border-gray-200 px-6 py-5 dark:border-white/10">
              <div className="mb-1 flex items-center justify-between text-lg font-bold">
                <span>Subtotal</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                Prices are confirmed at checkout. Delivery (if any) is added there.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  onCheckout();
                }}
                className="min-h-14 w-full rounded-xl bg-[#f5a623] font-bold text-[#14212b] shadow-lg transition hover:bg-[#ffc04d] focus-visible:ring-2 focus-visible:ring-[#14212b] focus-visible:outline-none dark:focus-visible:ring-white"
              >
                Proceed to checkout
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
