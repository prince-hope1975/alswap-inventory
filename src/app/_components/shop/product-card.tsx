"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, MessageCircle, ShoppingCart } from "lucide-react";
import { useCart } from "./cart-context";
import { StorefrontImage } from "./storefront-image";
import { StockBadge } from "./parts/stock-badge";
import { ProductPlaceholder } from "./parts/product-placeholder";
import {
    PRICE_ON_REQUEST_LABEL,
    effectivePrice,
    isPriceOnRequest,
} from "~/lib/domain/checkout";
import { productPath } from "~/lib/domain/slug";
import { meaningfulDescription, toDisplayCategoryName } from "~/lib/domain/shop-filters";
import { useShopCurrency } from "~/hooks/use-tenant-settings";

type Product = {
    id: string;
    name: string;
    slug?: string | null;
    price: string;
    salePrice?: string | null;
    image?: string | null;
    images?: string[] | null;
    category?: { name: string } | null;
    description?: string | null;
    stockQuantity: number | null;
    lowStockThreshold?: number | null;
};

interface ProductCardProps {
    product: Product;
    priority?: boolean;
    sizes?: string;
    /** Opens the quick-look dialog from the image; omit to render a plain image. */
    onQuickView?: () => void;
}

export function ProductCard({
    product,
    priority = false,
    sizes = "(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw",
    onQuickView,
}: ProductCardProps) {
    const { addItem } = useCart();
    const { formatCurrency } = useShopCurrency();
    const [isHovered, setIsHovered] = useState(false);
    const price = Number(product.price);
    const displayPrice = effectivePrice(product.price, product.salePrice);
    const onRequest = isPriceOnRequest(displayPrice);
    const discountPercent =
        !onRequest && price > 0 && displayPrice < price
            ? Math.round(((price - displayPrice) / price) * 100)
            : 0;
    const isOutOfStock = product.stockQuantity === 0;
    const categoryName = product.category ? toDisplayCategoryName(product.category.name) : null;
    const description = meaningfulDescription(product.description, product.name);

    const allImages = [
        ...(product.image ? [product.image] : []),
        ...(product.images ?? []),
    ];
    const displayImage = isHovered && allImages.length > 1 ? allImages[1] : allImages[0];

    const imageContent = (
        <>
            {displayImage ? (
                <StorefrontImage
                    src={displayImage}
                    alt={product.name}
                    fill
                    sizes={sizes}
                    priority={priority}
                    className="object-contain p-3 transition-transform duration-300 group-hover:scale-105 sm:p-4"
                />
            ) : (
                <ProductPlaceholder name={product.name} category={categoryName} />
            )}
            {discountPercent > 0 && (
                <span className="absolute top-2 left-2 rounded bg-[#c0392b] px-1.5 py-0.5 text-[11px] font-bold text-white">
                    -{discountPercent}%
                </span>
            )}
        </>
    );

    return (
        <div
            className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-[#14212b]/12 bg-white transition-all hover:border-[#0b6e99]/40 hover:shadow-lg hover:shadow-sky-950/10 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {onQuickView ? (
                <button
                    type="button"
                    onClick={onQuickView}
                    aria-label={`Quick view: ${product.name}`}
                    className="relative block aspect-square w-full overflow-hidden bg-white focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:outline-none focus-visible:ring-inset dark:bg-[#0f1a22]"
                >
                    {imageContent}
                    <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#14212b] opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-[#0a1117]/90 dark:text-white">
                        <Eye className="h-3.5 w-3.5" aria-hidden />
                        Quick view
                    </span>
                </button>
            ) : (
                <div className="relative aspect-square w-full overflow-hidden bg-white dark:bg-[#0f1a22]">
                    {imageContent}
                </div>
            )}

            <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
                {categoryName && (
                    <span className="truncate text-[11px] font-semibold tracking-wide text-[#0b6e99] uppercase dark:text-[#8dc5dc]">
                        {categoryName}
                    </span>
                )}
                {/*
                  * The image opens quick look, which gives crawlers nothing to
                  * follow. The title is a real permalink so every product has
                  * an indexable inbound link.
                  */}
                <h3
                    className="line-clamp-2 min-h-[2.5rem] text-sm leading-5 font-semibold text-[#14212b] sm:text-[15px] dark:text-white"
                    title={product.name}
                >
                    <Link
                        href={productPath(product)}
                        className="hover:text-[#0b6e99] hover:underline focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:outline-none dark:hover:text-[#8dc5dc]"
                    >
                        {product.name}
                    </Link>
                </h3>
                <div className="flex flex-wrap items-baseline gap-x-2">
                    {onRequest ? (
                        <span className="text-base font-bold text-[#41515c] dark:text-gray-300">
                            {PRICE_ON_REQUEST_LABEL}
                        </span>
                    ) : (
                        <span className="text-lg font-extrabold text-[#14212b] dark:text-white">
                            {formatCurrency(displayPrice)}
                        </span>
                    )}
                    {discountPercent > 0 && (
                        <span className="text-xs text-[#6b767d] line-through dark:text-gray-400">
                            <span className="sr-only">Was </span>
                            {formatCurrency(price)}
                        </span>
                    )}
                </div>
                <StockBadge
                    stockQuantity={product.stockQuantity}
                    lowStockThreshold={product.lowStockThreshold ?? 5}
                    className="self-start"
                />
                {description && (
                    <p className="hidden text-xs leading-5 text-[#5c6870] sm:line-clamp-2 dark:text-gray-400">
                        {description}
                    </p>
                )}
                {onRequest ? (
                    <Link
                        href={productPath(product)}
                        aria-label={`Ask about the price of ${product.name}`}
                        className="mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#14212b]/20 text-sm font-bold text-[#14212b] transition-colors hover:bg-[#14212b]/5 focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:ring-offset-2 focus-visible:outline-none dark:border-white/20 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-offset-[#0a1117]"
                    >
                        <MessageCircle className="h-4 w-4" aria-hidden />
                        Ask for price
                    </Link>
                ) : (
                <button
                    type="button"
                    aria-label={isOutOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
                    onClick={() => {
                        if (isOutOfStock) return;
                        addItem({
                            productId: product.id,
                            name: product.name,
                            price: displayPrice,
                            image: product.image,
                            stockQuantity: product.stockQuantity,
                        });
                    }}
                    disabled={isOutOfStock}
                    className={`mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-[#0a1117] ${
                        isOutOfStock
                            ? "cursor-not-allowed bg-[#14212b]/5 text-[#8a949a] dark:bg-white/5 dark:text-gray-500"
                            : "bg-[#f5a623] text-[#14212b] hover:bg-[#ffc04d] focus-visible:ring-[#14212b] dark:focus-visible:ring-white active:scale-[0.98]"
                    }`}
                >
                    <ShoppingCart className="h-4 w-4" aria-hidden />
                    {isOutOfStock ? "Out of stock" : "Add to cart"}
                </button>
                )}
            </div>
        </div>
    );
}
