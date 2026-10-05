/**
 * Quick stock adjustments from the inventory list ("+received", "-damaged",
 * "set count"). Pure so the movement math is testable without a database.
 *
 * `products.stockQuantity === -1` means "untracked" (quantity unknown). An
 * adjustment must never land on -1 by accident, or it would silently flip a
 * tracked product to untracked.
 */

export const UNTRACKED_STOCK = -1;

export type StockAdjustMode = "receive" | "remove" | "set";

export type StockMovementType = "OPENING_BALANCE" | "PURCHASE_RECEIPT" | "ADJUSTMENT" | "COUNT_VARIANCE";

export type StockAdjustResult =
  | { ok: true; noop: true; newQuantity: number }
  | { ok: true; noop: false; newQuantity: number; delta: number; movementType: StockMovementType }
  | { ok: false; error: string };

export function computeStockAdjustment(input: {
  current: number;
  mode: StockAdjustMode;
  amount: number;
}): StockAdjustResult {
  const { current, mode, amount } = input;

  if (!Number.isInteger(amount) || amount < 0) {
    return { ok: false, error: "Enter a whole number of 0 or more." };
  }

  const untracked = current === UNTRACKED_STOCK;

  if (mode === "set") {
    const from = untracked ? 0 : current;
    const delta = amount - from;
    if (!untracked && delta === 0) return { ok: true, noop: true, newQuantity: current };
    return {
      ok: true,
      noop: false,
      newQuantity: amount,
      delta,
      movementType: untracked ? "OPENING_BALANCE" : "COUNT_VARIANCE",
    };
  }

  if (untracked) {
    return { ok: false, error: "Stock is untracked. Set a count first." };
  }
  if (amount === 0) return { ok: true, noop: true, newQuantity: current };

  if (mode === "receive") {
    return { ok: true, noop: false, newQuantity: current + amount, delta: amount, movementType: "PURCHASE_RECEIPT" };
  }

  const next = current - amount;
  if (next < 0) {
    return { ok: false, error: `Only ${current} in stock. You can remove at most ${current}.` };
  }
  return { ok: true, noop: false, newQuantity: next, delta: -amount, movementType: "ADJUSTMENT" };
}

/** Variant stock is a decimal string; legacy rows may carry the -1 sentinel. */
export function nextVariantStock(currentVariantStock: string | number, delta: number) {
  return (Math.max(0, Number(currentVariantStock) || 0) + delta).toString();
}
