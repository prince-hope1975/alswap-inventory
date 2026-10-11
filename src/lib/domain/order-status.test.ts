import { describe, expect, it } from "vitest";

import {
  countsAsSale,
  holdsStock,
  isAwaitingOnlinePayment,
  manualStatusChangeError,
  orderStatusLabel,
  stockEffectOfStatusChange,
} from "./order-status";

const awaiting = { status: "PENDING", paymentMethod: "PAYSTACK" };
const pickup = { status: "PENDING", paymentMethod: "PAY_ON_PICKUP" };

describe("order status", () => {
  it("treats only PAYSTACK + PENDING as awaiting payment", () => {
    expect(isAwaitingOnlinePayment(awaiting)).toBe(true);
    expect(isAwaitingOnlinePayment(pickup)).toBe(false);
    expect(isAwaitingOnlinePayment({ status: "COMPLETED", paymentMethod: "PAYSTACK" })).toBe(false);
  });

  it("excludes awaiting-payment and cancelled orders from sales", () => {
    expect(countsAsSale(awaiting)).toBe(false);
    expect(countsAsSale({ status: "CANCELLED", paymentMethod: "CASH" })).toBe(false);
    expect(countsAsSale(pickup)).toBe(true);
    expect(countsAsSale({ status: "COMPLETED", paymentMethod: "PAYSTACK" })).toBe(true);
  });

  it("blocks manually completing an awaiting-payment order but allows cancelling it", () => {
    expect(manualStatusChangeError(awaiting, "COMPLETED")).toMatch(/awaiting online payment/);
    expect(manualStatusChangeError(awaiting, "CANCELLED")).toBeNull();
    expect(manualStatusChangeError(pickup, "COMPLETED")).toBeNull();
    expect(manualStatusChangeError({ status: "COMPLETED", paymentMethod: "PAYSTACK" }, "PENDING")).toMatch(/pending/);
    expect(manualStatusChangeError({ status: "COMPLETED", paymentMethod: "CASH" }, "PENDING")).toBeNull();
  });

  it("blocks manually completing a cancelled Paystack order", () => {
    const cancelledPaystack = { status: "CANCELLED", paymentMethod: "PAYSTACK" };
    expect(manualStatusChangeError(cancelledPaystack, "COMPLETED")).toMatch(/needs-attention/);
    expect(manualStatusChangeError(cancelledPaystack, "PENDING")).toMatch(/pending/);
    expect(manualStatusChangeError({ status: "CANCELLED", paymentMethod: "PAY_ON_PICKUP" }, "COMPLETED")).toBeNull();
    expect(manualStatusChangeError({ status: "COMPLETED", paymentMethod: "PAYSTACK" }, "CANCELLED")).toBeNull();
  });

  it("knows which orders currently hold stock", () => {
    expect(holdsStock(awaiting)).toBe(false);
    expect(holdsStock({ status: "COMPLETED", paymentMethod: "PAYSTACK" })).toBe(true);
    expect(holdsStock(pickup)).toBe(true);
    expect(holdsStock({ status: "COMPLETED", paymentMethod: "CASH" })).toBe(true);
    expect(holdsStock({ status: "CANCELLED", paymentMethod: "CASH" })).toBe(false);
    expect(holdsStock({ status: "COMPLETED", paymentMethod: "IMPORTED", isHistoricalImport: true })).toBe(false);
  });

  it("restores stock only when a stock-holding order is cancelled", () => {
    expect(stockEffectOfStatusChange(pickup, "CANCELLED")).toBe("restore");
    expect(stockEffectOfStatusChange({ status: "COMPLETED", paymentMethod: "CASH" }, "CANCELLED")).toBe("restore");
    expect(stockEffectOfStatusChange({ status: "COMPLETED", paymentMethod: "PAYSTACK" }, "CANCELLED")).toBe("restore");
    // Abandoned Paystack checkout: stock was never taken.
    expect(stockEffectOfStatusChange(awaiting, "CANCELLED")).toBe("none");
    expect(
      stockEffectOfStatusChange({ status: "COMPLETED", paymentMethod: "IMPORTED", isHistoricalImport: true }, "CANCELLED"),
    ).toBe("none");
    expect(stockEffectOfStatusChange(pickup, "COMPLETED")).toBe("none");
    expect(stockEffectOfStatusChange({ status: "CANCELLED", paymentMethod: "CASH" }, "CANCELLED")).toBe("none");
  });

  it("takes stock again when a cancelled non-Paystack order is reopened", () => {
    const cancelledPickup = { status: "CANCELLED", paymentMethod: "PAY_ON_PICKUP" };
    expect(stockEffectOfStatusChange(cancelledPickup, "PENDING")).toBe("take");
    expect(stockEffectOfStatusChange(cancelledPickup, "COMPLETED")).toBe("take");
  });

  it("labels statuses for humans", () => {
    expect(orderStatusLabel(awaiting)).toBe("Awaiting payment");
    expect(orderStatusLabel(pickup)).toBe("Pending");
    expect(orderStatusLabel({ status: "CANCELLED", paymentMethod: null })).toBe("Cancelled");
  });
});
