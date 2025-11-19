export const PAYMENT_METHODS = {
    CASH: "CASH",
    CARD: "CARD",
    TRANSFER: "TRANSFER",
    OTHER: "OTHER",
} as const;

export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    CASH: "Cash",
    CARD: "Card",
    TRANSFER: "Bank Transfer",
    OTHER: "Other",
};

export const DEFAULT_CURRENCY = "₦";

