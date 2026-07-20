"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./cart-context";
import { useCurrency } from "~/hooks/use-tenant-settings";

type Product = {
    id: string;
    name: string;
    price: string;
    salePrice?: string | null;
    image?: string | null;
    images?: string[] | null;
    category?: { name: string } | null;
    description?: string | null;
    stockQuantity: number | null;
};

export function ProductCard({ product }: { product: Product }) {
    const { addItem } = useCart();
    const { formatCurrency } = useCurrency();
    const [isHovered, setIsHovered] = useState(false);
    const price = Number(product.price);
    const salePrice = product.salePrice ? Number(product.salePrice) : null;
    const displayPrice = salePrice ?? price;
    const discountPercent = salePrice ? Math.round(((price - salePrice) / price) * 100) : 0;
    const isOutOfStock = product.stockQuantity === 0;

    const allImages = [
        ...(product.image ? [product.image] : []),
        ...(product.images ?? []),
    ];
    const displayImage = isHovered && allImages.length > 1 ? allImages[1] : allImages[0];

    return (
        <div
            className="group relative flex flex-col overflow-hidden rounded-2xl bg-white/5 border border-white/10 transition-all hover:border-white/20 hover:bg-white/10 hover:shadow-xl hover:shadow-sky-950/20"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="aspect-square w-full overflow-hidden bg-gray-800/50 relative">
                {displayImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={displayImage}
                        alt={product.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-500">
                        No Image
                    </div>
                )}

                {salePrice && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                        -{discountPercent}%
                    </div>
                )}

                {!isOutOfStock && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            addItem({
                                productId: product.id,
                                name: product.name,
                                price: displayPrice,
                                image: product.image,
                            });
                        }}
                        className="absolute bottom-4 right-4 flex h-10 w-10 translate-y-14 items-center justify-center rounded-full bg-[var(--brand-primary-600)] text-white shadow-lg transition-all duration-300 hover:bg-[var(--brand-primary-500)] group-hover:translate-y-0"
                        aria-label="Add to cart"
                    >
                        <ShoppingCart className="h-5 w-5" />
                    </button>
                )}
            </div>

            <div className="flex flex-1 flex-col p-4">
                {product.category && (
                    <span className="mb-1 text-xs font-medium text-[var(--brand-primary-400)]">
                        {product.category.name}
                    </span>
                )}
                <h3 className="mb-1 text-lg font-semibold text-white line-clamp-1" title={product.name}>
                    {product.name}
                </h3>
                <p className="mb-3 text-sm text-gray-400 line-clamp-2">
                    {product.description || "No description available"}
                </p>
                <div className="mt-auto flex items-center gap-2">
                    <span className="text-xl font-bold text-white">
                        {formatCurrency(displayPrice)}
                    </span>
                    {salePrice && (
                        <span className="text-sm text-gray-400 line-through">
                            {formatCurrency(price)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
