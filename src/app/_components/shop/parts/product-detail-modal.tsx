"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  X,
} from "lucide-react";

import { useCart } from "../cart-context";
import { StorefrontImage } from "../storefront-image";
import { StockBadge } from "./stock-badge";
import { ProductPlaceholder } from "./product-placeholder";
import { useShopCurrency } from "~/hooks/use-tenant-settings";
import { useDialogA11y } from "~/hooks/use-dialog-a11y";
import { api } from "~/trpc/react";
import {
  PRICE_ON_REQUEST_LABEL,
  effectivePrice,
  isPriceOnRequest,
  maxCartQuantity,
  whatsAppUrl,
} from "~/lib/domain/checkout";
import { meaningfulDescription, toDisplayCategoryName } from "~/lib/domain/shop-filters";
import { productPath } from "~/lib/domain/slug";

interface Product {
  id: string;
  name: string;
  slug?: string | null;
  price: string;
  salePrice?: string | null;
  image?: string | null;
  images?: string[] | null;
  description?: string | null;
  stockQuantity: number | null;
  lowStockThreshold?: number | null;
  category?: { name: string } | null;
}

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
}

const focusRing =
  "focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-[#8dc5dc] dark:focus-visible:ring-offset-[#0f1a22]";

/**
 * Quick look from the grid: photos, price, stock and a quantity + Add to
 * cart. Specs, reviews and the rest live on the full product page.
 */
export function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const { addItem, items } = useCart();
  const { formatCurrency } = useShopCurrency();
  const { data: shopDetails } = api.shop.getShopDetails.useQuery(undefined, { staleTime: 1000 * 60 * 5 });
  const { data: ratingData } = api.reviews.getAverageRating.useQuery(
    { productId: product.id },
    { retry: false },
  );
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y({ open: true, onClose, panelRef });

  const listPrice = Number(product.price);
  const displayPrice = effectivePrice(product.price, product.salePrice);
  const onRequest = isPriceOnRequest(displayPrice);
  const discountPercent =
    !onRequest && listPrice > 0 && displayPrice < listPrice
      ? Math.round(((listPrice - displayPrice) / listPrice) * 100)
      : 0;
  const isOutOfStock = product.stockQuantity === 0;
  const max = maxCartQuantity(product.stockQuantity);
  const inCart = items.find((item) => item.productId === product.id)?.quantity ?? 0;
  const remaining = max == null ? null : Math.max(0, max - inCart);
  const canAdd = !onRequest && !isOutOfStock && (remaining == null || remaining > 0);
  const categoryName = product.category ? toDisplayCategoryName(product.category.name) : null;
  const description = meaningfulDescription(product.description, product.name);
  const phone = shopDetails?.tenant?.phone;

  const allImages = Array.from(
    new Set([...(product.image ? [product.image] : []), ...(product.images ?? [])]),
  );
  const currentImage = allImages[imageIndex];

  const handleAddToCart = () => {
    if (!canAdd) return;
    addItem(
      {
        productId: product.id,
        name: product.name,
        price: displayPrice,
        image: product.image,
        stockQuantity: product.stockQuantity,
      },
      quantity,
    );
    onClose();
  };

  const step = (delta: number) =>
    setQuantity((q) => {
      const next = Math.max(1, q + delta);
      return remaining == null ? next : Math.min(next, Math.max(1, remaining));
    });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white text-[#14212b] shadow-2xl focus:outline-none sm:max-h-[90vh] sm:rounded-2xl dark:bg-[#0f1a22] dark:text-white"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick view"
          className={`absolute top-3 right-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-[#41515c] shadow hover:bg-white dark:bg-[#0a1117]/90 dark:text-gray-200 dark:hover:bg-[#0a1117] ${focusRing}`}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-2">
          {/* Gallery */}
          <div className="bg-[#f3f1ec] p-4 sm:p-6 dark:bg-[#0a1117]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-white sm:aspect-square dark:bg-[#0f1a22]">
              {currentImage ? (
                <StorefrontImage
                  src={currentImage}
                  alt={imageIndex === 0 ? product.name : `${product.name}, photo ${imageIndex + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 28rem"
                  className="object-contain p-4"
                />
              ) : (
                <ProductPlaceholder name={product.name} category={categoryName} size="lg" />
              )}
              {allImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setImageIndex((i) => (i - 1 + allImages.length) % allImages.length)}
                    aria-label="Previous photo"
                    className={`absolute top-1/2 left-2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#14212b] shadow hover:bg-white dark:bg-[#0a1117]/90 dark:text-white ${focusRing}`}
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageIndex((i) => (i + 1) % allImages.length)}
                    aria-label="Next photo"
                    className={`absolute top-1/2 right-2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#14212b] shadow hover:bg-white dark:bg-[#0a1117]/90 dark:text-white ${focusRing}`}
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden />
                  </button>
                </>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {allImages.slice(0, 10).map((img, idx) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => setImageIndex(idx)}
                    aria-label={`Show photo ${idx + 1} of ${allImages.length}`}
                    aria-current={idx === imageIndex}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-white dark:bg-[#0f1a22] ${focusRing} ${
                      idx === imageIndex
                        ? "border-[#0b6e99] dark:border-[#8dc5dc]"
                        : "border-transparent hover:border-[#14212b]/20 dark:hover:border-white/20"
                    }`}
                  >
                    <StorefrontImage src={img} alt="" fill sizes="5rem" className="object-contain p-1" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-4 p-5 sm:p-8">
            {categoryName && (
              <span className="text-xs font-semibold tracking-wide text-[#0b6e99] uppercase dark:text-[#8dc5dc]">
                {categoryName}
              </span>
            )}
            <h2 id={titleId} className="pr-10 text-2xl leading-tight font-bold sm:text-3xl">
              {product.name}
            </h2>

            {ratingData && ratingData.count > 0 && (
              <div className="flex items-center gap-2">
                <span className="flex" aria-hidden>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.round(ratingData.average ?? 0)
                          ? "fill-[#f5a623] text-[#f5a623]"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                    />
                  ))}
                </span>
                <span className="text-sm text-[#5c6870] dark:text-gray-400">
                  <span className="sr-only">Rated {(ratingData.average ?? 0).toFixed(1)} out of 5, </span>
                  {ratingData.count} {ratingData.count === 1 ? "review" : "reviews"}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-extrabold">
                {onRequest ? PRICE_ON_REQUEST_LABEL : formatCurrency(displayPrice)}
              </span>
              {discountPercent > 0 && (
                <>
                  <span className="text-lg text-[#8a949a] line-through">
                    <span className="sr-only">Was </span>
                    {formatCurrency(listPrice)}
                  </span>
                  <span className="rounded bg-[#c0392b] px-1.5 py-0.5 text-xs font-bold text-white">
                    -{discountPercent}%
                  </span>
                </>
              )}
            </div>

            <StockBadge
              stockQuantity={product.stockQuantity}
              lowStockThreshold={product.lowStockThreshold ?? undefined}
              showUntracked
              className="self-start"
            />

            {description && (
              <p className="line-clamp-4 text-sm leading-6 text-[#41515c] dark:text-gray-300">{description}</p>
            )}

            <div className="mt-auto space-y-3 pt-2">
              {canAdd ? (
                <div className="flex gap-3">
                  <div
                    role="group"
                    aria-label="Quantity"
                    className="inline-flex shrink-0 items-center rounded-lg border border-[#14212b]/15 dark:border-white/15"
                  >
                    <button
                      type="button"
                      onClick={() => step(-1)}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                      className={`grid h-12 w-11 place-items-center rounded-l-lg disabled:opacity-40 ${focusRing}`}
                    >
                      <Minus className="h-4 w-4" aria-hidden />
                    </button>
                    <span className="w-8 text-center font-semibold" aria-live="polite">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => step(1)}
                      disabled={remaining != null && quantity >= remaining}
                      aria-label="Increase quantity"
                      className={`grid h-12 w-11 place-items-center rounded-r-lg disabled:opacity-40 ${focusRing}`}
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    data-autofocus
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-[#f5a623] px-4 font-bold text-[#14212b] transition-colors hover:bg-[#ffc04d] focus-visible:ring-2 focus-visible:ring-[#14212b] focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] dark:focus-visible:ring-white dark:focus-visible:ring-offset-[#0f1a22]"
                  >
                    <ShoppingCart className="h-5 w-5" aria-hidden />
                    Add to cart
                  </button>
                </div>
              ) : (
                <div className="rounded-lg bg-[#14212b]/5 p-3 text-sm dark:bg-white/5">
                  <p className="font-semibold">
                    {onRequest
                      ? "Not priced online yet"
                      : isOutOfStock
                        ? "Out of stock"
                        : "You have all we have in stock in your cart"}
                  </p>
                  {phone && (onRequest || isOutOfStock) && (
                    <a
                      href={whatsAppUrl(
                        phone,
                        onRequest
                          ? `Hello, what is the price of ${product.name}?`
                          : `Hello, when will ${product.name} be back in stock?`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg bg-green-700 px-4 font-semibold text-white hover:bg-green-600 ${focusRing}`}
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden />
                      {onRequest ? "Ask for a price" : "Ask the store"}
                    </a>
                  )}
                </div>
              )}
              <Link
                href={productPath(product)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-semibold text-[#0b6e99] hover:underline dark:text-[#8dc5dc] ${focusRing}`}
              >
                See full details
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
