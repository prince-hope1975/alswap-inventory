/**
 * Order lifecycle as staff see it.
 *
 * PENDING means two different things depending on payment method:
 * - PAYSTACK + PENDING: the order was pre-created before the Paystack charge.
 *   No money has arrived and stock has NOT been decremented. Abandoned
 *   checkouts leave these behind. Only the payment finalizer (client verify
 *   or webhook) may complete them.
 * - anything else + PENDING (e.g. PAY_ON_PICKUP): a real order waiting for
 *   pickup/payment; stock is already taken.
 */

export type OrderLike = {
  status: string;
  paymentMethod: string | null | undefined;
  /** Imported receipts are recorded as sales but never moved stock. */
  isHistoricalImport?: boolean | null;
};

export function isAwaitingOnlinePayment(order: OrderLike) {
  return order.paymentMethod === "PAYSTACK" && order.status === "PENDING";
}

/** Counts toward revenue, sales and top-seller stats. */
export function countsAsSale(order: OrderLike) {
  return order.status !== "CANCELLED" && !isAwaitingOnlinePayment(order);
}

export function isPaid(order: OrderLike) {
  return order.status === "COMPLETED";
}

export type OrderStatusValue = "PENDING" | "COMPLETED" | "CANCELLED";

/**
 * Whether staff may set `next` by hand. Completing an awaiting-payment
 * Paystack order would skip the stock decrement and turn the later payment
 * webhook into a no-op, so it is blocked. Cancelling it (abandoned checkout)
 * is fine. A cancelled Paystack order can't be completed by hand either: if
 * money arrives for it, the finalizer raises a needs-attention notification
 * and staff resolve it from there.
 */
export function manualStatusChangeError(order: OrderLike, next: OrderStatusValue): string | null {
  if (next === "COMPLETED" && isAwaitingOnlinePayment(order)) {
    return "This order is awaiting online payment. It completes automatically once Paystack confirms the payment.";
  }
  if (next === "COMPLETED" && order.paymentMethod === "PAYSTACK" && order.status === "CANCELLED") {
    return "Cancelled Paystack orders can't be completed by hand. If the customer paid, follow the needs-attention notification for this order.";
  }
  if (next === "PENDING" && order.paymentMethod === "PAYSTACK" && order.status !== "PENDING") {
    // PAYSTACK + PENDING means "not paid yet"; reopening would misreport it.
    return "Paystack orders can't be set back to pending.";
  }
  return null;
}

/**
 * Whether the order's items are currently taken out of `products.stockQuantity`.
 * - Imported historical receipts never moved stock.
 * - PAYSTACK orders take stock only when payment finalizes (COMPLETED).
 * - Everything else (pay on pickup, POS cash/card/transfer) takes stock when
 *   the order is created and holds it until cancelled.
 */
export function holdsStock(order: OrderLike) {
  if (order.isHistoricalImport) return false;
  if (order.status === "CANCELLED") return false;
  if (order.paymentMethod === "PAYSTACK") return order.status === "COMPLETED";
  return order.status === "PENDING" || order.status === "COMPLETED";
}

export type StockEffect = "restore" | "take" | "none";

/** What a manual status change must do to stock so it stays consistent. */
export function stockEffectOfStatusChange(order: OrderLike, next: OrderStatusValue): StockEffect {
  const before = holdsStock(order);
  const after = holdsStock({ ...order, status: next });
  if (before && !after) return "restore";
  if (!before && after) return "take";
  return "none";
}

export function orderStatusLabel(order: OrderLike) {
  if (isAwaitingOnlinePayment(order)) return "Awaiting payment";
  if (order.status === "PENDING") return "Pending";
  if (order.status === "COMPLETED") return "Completed";
  if (order.status === "CANCELLED") return "Cancelled";
  return order.status;
}
