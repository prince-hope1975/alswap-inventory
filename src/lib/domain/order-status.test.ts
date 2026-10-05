import { describe, expect, it } from "vitest";

import { countsAsSale, isAwaitingOnlinePayment, manualStatusChangeError, orderStatusLabel } from "./order-status";

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

  it("labels statuses for humans", () => {
    expect(orderStatusLabel(awaiting)).toBe("Awaiting payment");
    expect(orderStatusLabel(pickup)).toBe("Pending");
    expect(orderStatusLabel({ status: "CANCELLED", paymentMethod: null })).toBe("Cancelled");
  });
});
