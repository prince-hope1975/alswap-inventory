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

export type OrderLike = { status: string; paymentMethod: string | null | undefined };

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
 * is fine.
 */
export function manualStatusChangeError(order: OrderLike, next: OrderStatusValue): string | null {
  if (next === "COMPLETED" && isAwaitingOnlinePayment(order)) {
    return "This order is awaiting online payment. It completes automatically once Paystack confirms the payment.";
  }
  if (next === "PENDING" && order.paymentMethod === "PAYSTACK" && order.status !== "PENDING") {
    // PAYSTACK + PENDING means "not paid yet"; reopening would misreport it.
    return "Paystack orders can't be set back to pending.";
  }
  return null;
}

export function orderStatusLabel(order: OrderLike) {
  if (isAwaitingOnlinePayment(order)) return "Awaiting payment";
  if (order.status === "PENDING") return "Pending";
  if (order.status === "COMPLETED") return "Completed";
  if (order.status === "CANCELLED") return "Cancelled";
  return order.status;
}
