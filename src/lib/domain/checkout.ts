/**
 * Pure storefront checkout rules shared by the cart, the checkout modal, the
 * shop router and the Paystack webhook. Nothing here touches the database or
 * env, so it can be unit tested directly.
 */

// --- Cart ---

export type CartLine = {
  productId: string;
  name: string;
  price: number;
  image?: string | null;
  quantity: number;
  /**
   * Stock on hand when the item was added. `-1`, `null` or missing means the
   * store doesn't track stock for it, so there is no cap.
   */
  stockQuantity?: number | null;
};

/** Highest quantity a shopper may hold, or `null` when stock is untracked. */
export function maxCartQuantity(stockQuantity: number | null | undefined) {
  if (stockQuantity == null || stockQuantity < 0) return null;
  return stockQuantity;
}

export function capQuantity(
  requested: number,
  stockQuantity: number | null | undefined,
) {
  const wanted = Math.max(0, Math.floor(requested));
  const max = maxCartQuantity(stockQuantity);
  return max == null ? wanted : Math.min(wanted, max);
}

/**
 * Add `quantity` of a product to the cart, merging with an existing line and
 * never exceeding known stock. `capped` tells the UI the shopper asked for
 * more than is available.
 */
export function addCartItem(
  lines: CartLine[],
  item: Omit<CartLine, "quantity">,
  quantity = 1,
): { lines: CartLine[]; added: number; capped: boolean } {
  const requested = Math.max(1, Math.floor(quantity));
  const existing = lines.find((line) => line.productId === item.productId);
  // Fresher stock info wins; keep the old value if the caller didn't send one.
  const stockQuantity =
    item.stockQuantity !== undefined
      ? item.stockQuantity
      : existing?.stockQuantity;
  const current = existing?.quantity ?? 0;
  const next = capQuantity(current + requested, stockQuantity);
  const added = Math.max(0, next - current);
  const capped = next < current + requested;

  if (existing) {
    return {
      lines: lines.map((line) =>
        line.productId === item.productId
          ? { ...line, ...item, stockQuantity, quantity: Math.max(next, current) }
          : line,
      ),
      added,
      capped,
    };
  }
  if (next <= 0) return { lines, added: 0, capped: true };
  return {
    lines: [...lines, { ...item, stockQuantity, quantity: next }],
    added,
    capped,
  };
}

// --- Money ---

/**
 * The one storefront money formatter. `currency` is the tenant's symbol
 * (e.g. "₦"), not an ISO code. Naira prices are whole numbers in practice, so
 * kobo are never shown for ₦.
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currency: string | null | undefined = "₦",
) {
  const symbol = currency ?? "₦";
  const num = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  const value = Number.isFinite(num) ? num : 0;
  const noDecimals = symbol === "₦" || symbol.toUpperCase() === "NGN";
  return `${symbol}${new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: noDecimals ? 0 : 2,
  }).format(value)}`;
}

export function toKobo(amount: number | string) {
  return Math.round(Number(amount) * 100);
}

// --- Orders ---

/** Short order number shown to shoppers; matches the `#xxxxxxxx` staff see. */
export function orderNumber(orderId: string) {
  return orderId.slice(0, 8);
}

/**
 * Paystack requires an email. Shoppers may skip it, so fall back to a
 * per-order address on our own domain that never reaches a real inbox.
 */
export function paystackEmailFor(
  customerEmail: string | null | undefined,
  reference: string,
) {
  const email = customerEmail?.trim();
  if (email) return email;
  return `orders+${reference}@sppdamaks.com`;
}

export function isPlaceholderEmail(email: string | null | undefined) {
  return Boolean(email?.endsWith("@sppdamaks.com") && email.startsWith("orders+"));
}

export function whatsAppUrl(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

/** Paystack references allow only alphanumerics, `-`, `.` and `=`. */
export function newPaymentReference(random: string) {
  return `ps-${Date.now().toString(36)}-${random.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`;
}

// --- Checkout form ---

export type CheckoutDetails = { name: string; phone: string; email: string };
export type CheckoutErrors = Partial<Record<keyof CheckoutDetails | "deliveryAddress", string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mirrors the server zod rules so shoppers see the problem next to the field. */
export function validateCheckoutDetails(
  details: CheckoutDetails,
  delivery?: { method: "PICKUP" | "DELIVERY"; address: string },
): CheckoutErrors {
  const errors: CheckoutErrors = {};
  if (!details.name.trim()) errors.name = "Enter your name.";
  const digits = details.phone.replace(/\D/g, "");
  if (!details.phone.trim()) errors.phone = "Enter a phone number so the store can reach you.";
  else if (digits.length < 7) errors.phone = "That phone number looks too short.";
  if (details.email.trim() && !EMAIL_PATTERN.test(details.email.trim())) {
    errors.email = "Check the email address, or leave it blank.";
  }
  if (delivery?.method === "DELIVERY" && delivery.address.trim().length < 5) {
    errors.deliveryAddress = "Enter your full delivery address.";
  }
  return errors;
}

export type OpeningHours = { days: string[]; opens: string; closes: string };

export function formatOpeningHours(hours: OpeningHours[] | null | undefined) {
  if (!hours?.length) return [];
  return hours.map((slot) => `${slot.days.join(", ")}: ${slot.opens}–${slot.closes}`);
}

// --- Pay-on-pickup abuse limits ---

/**
 * Pay-on-pickup reserves stock with no payment, so one anonymous order could
 * otherwise lock up a whole shelf. Paystack orders take stock only after
 * payment, so they keep the wider cart limit.
 */
export const PAY_ON_PICKUP_MAX_QUANTITY = 50;

/** Unpaid pickup orders one phone number may have open in the last 24h. */
export const PAY_ON_PICKUP_MAX_OPEN_PER_PHONE = 3;

/**
 * Error for the first product whose total quantity (duplicate lines merged,
 * as checkout merges them) exceeds the pay-on-pickup cap, else null.
 */
export function pickupQuantityError(
  items: { productId: string; quantity: number }[],
  max = PAY_ON_PICKUP_MAX_QUANTITY,
): string | null {
  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
  }
  for (const total of totals.values()) {
    if (total > max) {
      return `Pay on pickup is limited to ${max} of each item. Pay online or contact the store for larger orders.`;
    }
  }
  return null;
}

/**
 * Comparable form of a phone number: digits only, last 10 kept, so
 * "+234 801 234 5678", "2348012345678" and "08012345678" all match. Must stay
 * in step with the SQL in `shop.createOrder`.
 */
export function phoneMatchKey(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

// --- Prices ---

/**
 * The price a shopper pays: a non-negative sale price wins over the list
 * price. Same rule as the POS (`prepareSale`) and the shop router, so card,
 * product page, cart and server never disagree.
 */
export function effectivePrice(
  price: number | string | null | undefined,
  salePrice?: number | string | null,
) {
  const sale = salePrice == null || salePrice === "" ? null : Number(salePrice);
  if (sale != null && Number.isFinite(sale) && sale >= 0) return sale;
  const list = Number(price ?? 0);
  return Number.isFinite(list) ? list : 0;
}

/**
 * A product priced at 0 (or not priced) can't be bought online: shoppers see
 * "Price on request" and contact the store instead.
 */
export function isPriceOnRequest(price: number | string | null | undefined) {
  const value = Number(price ?? 0);
  return !(Number.isFinite(value) && value > 0);
}

export const PRICE_ON_REQUEST_LABEL = "Price on request";

// --- Store options ---

type StorefrontTenantLike = {
  /** True only when the store can actually take Paystack payments. */
  canPayOnline?: boolean | null;
  currency?: string | null;
  storeConfig?: {
    deliveryFee?: number | null;
    deliveryPricing?: { type: "flat" | "distance" } | null;
  } | null;
} | null | undefined;

export type StorefrontOptions = {
  canPayOnline: boolean;
  /** Delivery is paid online, so it needs online payment plus a delivery setup. */
  offersDelivery: boolean;
  deliveryPricing: "flat" | "distance" | null;
  /** Flat fee; null for distance pricing or when delivery is off. */
  flatDeliveryFee: number | null;
  /** Short fee text: "Free delivery", "₦2,000 delivery" or "Fee depends on distance". */
  deliveryLabel: string | null;
  defaultPaymentMethod: "PAYSTACK" | "PAY_ON_PICKUP";
};

/** Fee as shown to shoppers: never "₦0". */
export function deliveryFeeText(fee: number, currency?: string | null) {
  return fee > 0 ? formatMoney(fee, currency) : "Free";
}

/**
 * What a store's checkout offers. The one rule for the product page, the
 * checkout modal and the server (`initPaystackPayment`).
 */
export function storefrontOptions(tenant: StorefrontTenantLike): StorefrontOptions {
  const canPayOnline = Boolean(tenant?.canPayOnline);
  const config = tenant?.storeConfig ?? null;
  const rawFee = Number(config?.deliveryFee ?? 0);
  const fee = Number.isFinite(rawFee) && rawFee > 0 ? rawFee : 0;
  const configured = config?.deliveryPricing != null || fee > 0;
  const offersDelivery = canPayOnline && configured;
  const deliveryPricing = offersDelivery
    ? config?.deliveryPricing?.type === "distance"
      ? "distance"
      : "flat"
    : null;
  const flatDeliveryFee = deliveryPricing === "flat" ? fee : null;
  const deliveryLabel =
    deliveryPricing === "distance"
      ? "Fee depends on distance"
      : flatDeliveryFee == null
        ? null
        : flatDeliveryFee > 0
          ? `${formatMoney(flatDeliveryFee, tenant?.currency)} delivery`
          : "Free delivery";
  return {
    canPayOnline,
    offersDelivery,
    deliveryPricing,
    flatDeliveryFee,
    deliveryLabel,
    defaultPaymentMethod: canPayOnline ? "PAYSTACK" : "PAY_ON_PICKUP",
  };
}
