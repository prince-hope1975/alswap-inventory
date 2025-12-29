"use client";

import { useState } from "react";
import { X, Minus, Plus, ShoppingCart, Package, AlertCircle } from "lucide-react";
import { useCart } from "../cart-context";
import { useCurrency } from "~/hooks/use-tenant-settings";

interface Product {
  id: string;
  name: string;
  price: string;
  image?: string | null;
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
  const { addItem } = useCart();
  const { formatCurrency } = useCurrency();
  
  // Guard against null/undefined product
  if (!product) {
    return null;
  }
  
  const price = parseFloat(product.price || "0");
  const qty = product.stockQuantity ?? -1;
  const isOutOfStock = qty === 0;
  const isLowStock = qty > 0 && qty <= 10;
  
  const handleAddToCart = () => {
    if (isOutOfStock) return;
    
    addItem({
      productId: product.id,
      name: product.name,
      price,
      image: product.image,
    });
    
    // Close modal after adding to cart
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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
          
          <div className="grid md:grid-cols-2 gap-8 p-6 md:p-8">
            {/* Left Column - Image */}
            <div className="space-y-4">
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                {product.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <Package className="h-24 w-24 text-gray-400 dark:text-gray-600" />
                  </div>
                )}
                
                {/* Stock Badge Overlay */}
                {isOutOfStock && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg">
                      OUT OF STOCK
                    </span>
                  </div>
                )}
              </div>
              
              {/* Thumbnail placeholder for future multi-image support */}
              {/* <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <button key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <div className="w-full h-full" />
                  </button>
                ))}
              </div> */}
            </div>
            
            {/* Right Column - Details */}
            <div className="space-y-6">
              {/* Category */}
              {product.category && (
                <div className="inline-block px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium">
                  {product.category.name}
                </div>
              )}
              
              {/* Title */}
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {product.name}
              </h1>
              
              {/* Price */}
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(price)}
              </div>
              
              {/* Stock Status */}
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
              
              {/* Description */}
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
              
              {/* Product Details */}
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
                    {qty === -1 ? 'In Stock' : `${qty} units`}
                  </span>
                </div>
              </div>
              
              {/* Quantity Selector & Add to Cart */}
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
                    className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-lg shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                  >
                    <ShoppingCart className="h-6 w-6" />
                    Add to Cart
                  </button>
                </div>
              )}
              
              {/* Reviews Section Placeholder */}
              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Customer Reviews
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No reviews yet. Be the first to review this product!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
