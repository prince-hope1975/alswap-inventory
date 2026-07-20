"use client";

import { useState } from "react";
import { X, Minus, Plus, ShoppingCart, Package, AlertCircle, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useCart } from "../cart-context";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { api } from "~/trpc/react";

interface Product {
  id: string;
  name: string;
  price: string;
  salePrice?: string | null;
  image?: string | null;
  images?: string[] | null;
  description?: string | null;
  stockQuantity: number | null;
  sku?: string | null;
  barcode?: string | null;
  category?: { name: string } | null;
}

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
}

export function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const { addItem } = useCart();
  const { formatCurrency } = useCurrency();

  const { data: reviewsData } = api.reviews.getProductReviews.useQuery({
    productId: product.id,
    limit: 10,
  });

  const { data: ratingData } = api.reviews.getAverageRating.useQuery({
    productId: product.id,
  });

  const utils = api.useUtils();

  const createReview = api.reviews.createReview.useMutation({
    onSuccess: () => {
      setShowReviewForm(false);
      void utils.reviews.getProductReviews.invalidate({ productId: product.id });
      void utils.reviews.getAverageRating.invalidate({ productId: product.id });
    },
  });

  if (!product) {
    return null;
  }

  const price = parseFloat(product.price || "0");
  const salePrice = product.salePrice ? parseFloat(product.salePrice) : null;
  const displayPrice = salePrice ?? price;
  const discountPercent = salePrice ? Math.round(((price - salePrice) / price) * 100) : 0;
  const qty = product.stockQuantity ?? -1;
  const isOutOfStock = qty === 0;
  const isLowStock = qty > 0 && qty <= 10;

  const allImages = [
    ...(product.image ? [product.image] : []),
    ...(product.images ?? []),
  ];
  const currentImage = allImages[currentImageIndex];

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    addItem({
      productId: product.id,
      name: product.name,
      price: displayPrice,
      image: product.image,
    });

    setTimeout(() => onClose(), 300);
  };

  const incrementQuantity = () => {
    if (qty === -1 || quantity < qty) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>

          <div className="grid md:grid-cols-2 gap-8 p-6 md:p-8">
            <div className="space-y-4">
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                {currentImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentImage}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <Package className="h-24 w-24 text-gray-400 dark:text-gray-600" />
                  </div>
                )}

                {isOutOfStock && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg">
                      OUT OF STOCK
                    </span>
                  </div>
                )}

                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-lg"
                    >
                      <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-lg"
                    >
                      <ChevronRight className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    </button>
                  </>
                )}
              </div>

              {allImages.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        idx === currentImageIndex
                          ? "border-[#0b6e99] dark:border-[#8dc5dc]"
                          : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              {product.category && (
                <div className="inline-block px-3 py-1 rounded-full bg-[#dcecf2] dark:bg-[#112b3c]/30 text-[#07597d] dark:text-[#b8dbea] text-sm font-medium">
                  {product.category.name}
                </div>
              )}

              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {product.name}
              </h1>

              {ratingData && ratingData.count > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.round(ratingData.average ?? 0)
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-200 dark:text-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ({ratingData.count} {ratingData.count === 1 ? "review" : "reviews"})
                  </span>
                </div>
              )}

              <div className="flex items-baseline gap-3">
                <div className="text-3xl font-bold text-[#0b6e99] dark:text-[#8dc5dc]">
                  {formatCurrency(displayPrice)}
                </div>
                {salePrice && (
                  <>
                    <div className="text-xl text-gray-400 dark:text-gray-500 line-through">
                      {formatCurrency(price)}
                    </div>
                    <div className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-semibold rounded">
                      -{discountPercent}%
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isOutOfStock ? (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-semibold">Out of Stock</span>
                  </div>
                ) : isLowStock ? (
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-semibold">Only {product.stockQuantity} left in stock!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Package className="h-5 w-5" />
                    <span className="font-semibold">In Stock</span>
                  </div>
                )}
              </div>

              {product.description && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Description
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Product Details
                </h3>
                {product.sku && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">SKU:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{product.sku}</span>
                  </div>
                )}
                {product.barcode && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Barcode:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{product.barcode}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Availability:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {qty === -1 ? "In Stock" : `${qty} units`}
                  </span>
                </div>
              </div>

              {!isOutOfStock && (
                <div className="pt-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Quantity:
                    </span>
                    <div className="flex items-center gap-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2">
                      <button
                        onClick={decrementQuantity}
                        disabled={quantity <= 1}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white w-8 text-center">
                        {quantity}
                      </span>
                      <button
                        onClick={incrementQuantity}
                        disabled={qty !== -1 && quantity >= qty}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleAddToCart}
                    className="w-full py-4 px-6 rounded-xl bg-[#0b6e99] hover:bg-[#07597d] text-white font-bold text-lg shadow-lg shadow-[#167da8]/25 hover:shadow-[#167da8]/40 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                  >
                    <ShoppingCart className="h-6 w-6" />
                    Add to Cart
                  </button>
                </div>
              )}

              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Customer Reviews
                  </h3>
                  <button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="text-sm text-[#0b6e99] dark:text-[#8dc5dc] hover:text-[#07597d] dark:hover:text-[#b8dbea] font-medium"
                  >
                    {showReviewForm ? "Cancel" : "Write a Review"}
                  </button>
                </div>

                {showReviewForm && (
                  <ReviewForm
                    productId={product.id}
                    onSubmit={createReview.mutate}
                    isSubmitting={createReview.isPending}
                  />
                )}

                {reviewsData && reviewsData.reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviewsData.reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-gray-200 dark:text-gray-600"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {review.customerName}
                          </span>
                        </div>
                        {review.title && (
                          <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                            {review.title}
                          </h4>
                        )}
                        {review.body && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {review.body}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  !showReviewForm && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      No reviews yet. Be the first to review this product!
                    </p>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ReviewForm({
  productId,
  onSubmit,
  isSubmitting,
}: {
  productId: string;
  onSubmit: (data: {
    productId: string;
    customerName: string;
    customerEmail: string;
    rating: number;
    title?: string;
    body?: string;
  }) => void;
  isSubmitting: boolean;
}) {
  const [rating, setRating] = useState(5);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      productId,
      customerName,
      customerEmail,
      rating,
      title: title || undefined,
      body: body || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Rating
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="focus:outline-none"
            >
              <Star
                className={`h-6 w-6 ${
                  star <= rating
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-300 dark:text-gray-600"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Name
        </label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#167da8] focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email
        </label>
        <input
          type="email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#167da8] focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Review Title (optional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#167da8] focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Review (optional)
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#167da8] focus:border-transparent"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2 px-4 bg-[#0b6e99] hover:bg-[#07597d] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Submitting..." : "Submit Review"}
      </button>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Your review will be visible after approval
      </p>
    </form>
  );
}
