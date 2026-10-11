import { describe, expect, it } from "vitest";

import { DELIVERY_LABEL, enumLabel, paymentLabel } from "./order-labels";

describe("paymentLabel", () => {
  it("maps known payment methods", () => {
    expect(paymentLabel("PAYSTACK")).toBe("Paystack (online)");
    expect(paymentLabel("TRANSFER")).toBe("Bank transfer");
    expect(paymentLabel("PAY_ON_PICKUP")).toBe("Pay on pickup");
  });

  it("sentence-cases unknown codes", () => {
    expect(paymentLabel("MOBILE_MONEY")).toBe("Mobile money");
  });

  it("shows a dash for missing values", () => {
    expect(paymentLabel(null)).toBe("—");
    expect(paymentLabel("")).toBe("—");
  });
});

describe("enumLabel", () => {
  it("works with any map", () => {
    expect(enumLabel(DELIVERY_LABEL, "DELIVERY")).toBe("Delivery");
  });
});
