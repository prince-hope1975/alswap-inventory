/**
 * Human labels for order enums, shared by the orders page and sales history.
 */

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const DELIVERY_LABEL: Record<string, string> = { PICKUP: "Pickup", DELIVERY: "Delivery" };

export const PAYMENT_LABEL: Record<string, string> = {
  PAYSTACK: "Paystack (online)",
  CASH: "Cash",
  CARD: "Card",
  TRANSFER: "Bank transfer",
  PAY_ON_PICKUP: "Pay on pickup",
  IMPORTED: "Imported",
};

/**
 * Looks `value` up in `map`; unknown codes become sentence case
 * ("MOBILE_MONEY" -> "Mobile money"), empty values an em dash.
 */
export function enumLabel(map: Record<string, string>, value: string | null | undefined) {
  if (!value) return "—";
  return map[value] ?? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase().replace(/_/g, " ");
}

export function paymentLabel(value: string | null | undefined) {
  return enumLabel(PAYMENT_LABEL, value);
}
