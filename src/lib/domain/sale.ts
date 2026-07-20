interface RequestedSaleLine {
  productId: string;
  quantity: number;
  clientPrice?: number;
}

interface SaleProduct {
  id: string;
  price: number;
  salePrice: number | null;
  stockQuantity: number;
}

export function prepareSale(input: { requested: RequestedSaleLine[]; products: SaleProduct[] }) {
  if (input.requested.length === 0) throw new Error("Sale must contain at least one item");
  const products = new Map(input.products.map((product) => [product.id, product]));
  const lines = input.requested.map((requested) => {
    const product = products.get(requested.productId);
    if (!product) throw new Error(`Product not found: ${requested.productId}`);
    if (!Number.isInteger(requested.quantity) || requested.quantity <= 0) {
      throw new Error(`Invalid quantity for ${requested.productId}`);
    }
    if (product.stockQuantity < requested.quantity) {
      throw new Error(`Insufficient stock for ${requested.productId}`);
    }
    const unitPrice = product.salePrice != null && product.salePrice >= 0 ? product.salePrice : product.price;
    return { productId: product.id, quantity: requested.quantity, unitPrice, lineTotal: unitPrice * requested.quantity };
  });
  return { lines, total: lines.reduce((sum, line) => sum + line.lineTotal, 0) };
}
