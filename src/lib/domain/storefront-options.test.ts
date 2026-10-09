import { describe, expect, it } from "vitest";

import {
  deliveryFeeText,
  effectivePrice,
  isPriceOnRequest,
  storefrontOptions,
} from "./checkout";

describe("effectivePrice", () => {
  it("uses a non-negative sale price over the list price", () => {
    expect(effectivePrice("5000", "4000")).toBe(4000);
    expect(effectivePrice(5000, null)).toBe(5000);
    expect(effectivePrice("5000", undefined)).toBe(5000);
  });

  it("matches the server: a sale price of 0 wins (and is then price on request)", () => {
    expect(effectivePrice("5000", "0")).toBe(0);
    expect(isPriceOnRequest(effectivePrice("5000", "0"))).toBe(true);
  });

  it("ignores garbage values", () => {
    expect(effectivePrice("abc", "")).toBe(0);
    expect(effectivePrice("1200", "-1")).toBe(1200);
  });
});

describe("isPriceOnRequest", () => {
  it("is true for 0, negatives, missing and non-numeric prices", () => {
    expect(isPriceOnRequest(0)).toBe(true);
    expect(isPriceOnRequest("0.00")).toBe(true);
    expect(isPriceOnRequest(-5)).toBe(true);
    expect(isPriceOnRequest(null)).toBe(true);
    expect(isPriceOnRequest("n/a")).toBe(true);
  });

  it("is false for any positive price", () => {
    expect(isPriceOnRequest(1)).toBe(false);
    expect(isPriceOnRequest("2500")).toBe(false);
  });
});

describe("storefrontOptions", () => {
  it("defaults to pay on pickup with no delivery when online payment is off", () => {
    const options = storefrontOptions({
      canPayOnline: false,
      storeConfig: { deliveryFee: 2000 },
    });
    expect(options).toMatchObject({
      canPayOnline: false,
      offersDelivery: false,
      deliveryLabel: null,
      defaultPaymentMethod: "PAY_ON_PICKUP",
    });
  });

  it("offers flat delivery with a fee label when Paystack is set up", () => {
    const options = storefrontOptions({
      canPayOnline: true,
      currency: "₦",
      storeConfig: { deliveryFee: 2000 },
    });
    expect(options).toMatchObject({
      offersDelivery: true,
      deliveryPricing: "flat",
      flatDeliveryFee: 2000,
      deliveryLabel: "₦2,000 delivery",
      defaultPaymentMethod: "PAYSTACK",
    });
  });

  it("says Free delivery instead of ₦0 for a configured zero fee", () => {
    const options = storefrontOptions({
      canPayOnline: true,
      storeConfig: { deliveryPricing: { type: "flat" }, deliveryFee: 0 },
    });
    expect(options.offersDelivery).toBe(true);
    expect(options.deliveryLabel).toBe("Free delivery");
  });

  it("describes distance pricing without a number", () => {
    const options = storefrontOptions({
      canPayOnline: true,
      storeConfig: { deliveryPricing: { type: "distance" } },
    });
    expect(options.deliveryPricing).toBe("distance");
    expect(options.flatDeliveryFee).toBeNull();
    expect(options.deliveryLabel).toBe("Fee depends on distance");
  });

  it("has no delivery when nothing is configured", () => {
    expect(storefrontOptions({ canPayOnline: true, storeConfig: {} }).offersDelivery).toBe(false);
    expect(storefrontOptions(null).offersDelivery).toBe(false);
  });

  it("formats fees without ever showing ₦0", () => {
    expect(deliveryFeeText(0, "₦")).toBe("Free");
    expect(deliveryFeeText(1500, "₦")).toBe("₦1,500");
  });
});
