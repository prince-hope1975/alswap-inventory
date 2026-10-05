import { describe, expect, it } from "vitest";

import {
  addCartItem,
  capQuantity,
  formatMoney,
  newPaymentReference,
  paystackEmailFor,
  validateCheckoutDetails,
  type CartLine,
} from "./checkout";

const item = { productId: "p1", name: "Inverter", price: 1000, image: null };

describe("addCartItem", () => {
  it("adds a new line with the requested quantity", () => {
    const { lines, added, capped } = addCartItem([], item, 3);
    expect(lines).toEqual([{ ...item, stockQuantity: undefined, quantity: 3 }]);
    expect(added).toBe(3);
    expect(capped).toBe(false);
  });

  it("merges into an existing line instead of overwriting it", () => {
    const start: CartLine[] = [{ ...item, quantity: 2 }];
    const { lines } = addCartItem(start, item, 2);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(4);
  });

  it("caps at known stock and reports how many went in", () => {
    const start: CartLine[] = [{ ...item, quantity: 2, stockQuantity: 3 }];
    const result = addCartItem(start, { ...item, stockQuantity: 3 }, 5);
    expect(result.lines[0]?.quantity).toBe(3);
    expect(result.added).toBe(1);
    expect(result.capped).toBe(true);
  });

  it("adds nothing when the cart already holds all the stock", () => {
    const start: CartLine[] = [{ ...item, quantity: 3, stockQuantity: 3 }];
    const result = addCartItem(start, item, 1);
    expect(result.lines[0]?.quantity).toBe(3);
    expect(result.added).toBe(0);
  });

  it("does not add a line for an out-of-stock product", () => {
    const result = addCartItem([], { ...item, stockQuantity: 0 }, 1);
    expect(result.lines).toEqual([]);
    expect(result.capped).toBe(true);
  });

  it("treats -1 stock as untracked (no cap)", () => {
    const result = addCartItem([], { ...item, stockQuantity: -1 }, 50);
    expect(result.lines[0]?.quantity).toBe(50);
  });

  it("defaults to one and ignores nonsense quantities", () => {
    expect(addCartItem([], item).lines[0]?.quantity).toBe(1);
    expect(addCartItem([], item, 0).lines[0]?.quantity).toBe(1);
  });
});

describe("capQuantity", () => {
  it("caps tracked stock and leaves untracked alone", () => {
    expect(capQuantity(5, 2)).toBe(2);
    expect(capQuantity(5, -1)).toBe(5);
    expect(capQuantity(5, null)).toBe(5);
  });
});

describe("formatMoney", () => {
  it("formats naira without decimals using en-NG grouping", () => {
    expect(formatMoney(1250000, "₦")).toBe("₦1,250,000");
    expect(formatMoney("1999.6", "₦")).toBe("₦2,000");
  });

  it("falls back to ₦ and zero for missing values", () => {
    expect(formatMoney(null, null)).toBe("₦0");
    expect(formatMoney("abc")).toBe("₦0");
  });

  it("keeps up to two decimals for other currencies", () => {
    expect(formatMoney(10.5, "$")).toBe("$10.5");
  });
});

describe("paystackEmailFor", () => {
  it("uses the shopper's email when given", () => {
    expect(paystackEmailFor(" a@b.co ", "ps-1")).toBe("a@b.co");
  });

  it("falls back to a per-order placeholder", () => {
    expect(paystackEmailFor("", "ps-abc")).toBe("orders+ps-abc@sppdamaks.com");
    expect(paystackEmailFor(undefined, "ps-abc")).toBe("orders+ps-abc@sppdamaks.com");
  });
});

describe("newPaymentReference", () => {
  it("only uses characters Paystack accepts", () => {
    expect(newPaymentReference("1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed")).toMatch(/^[a-zA-Z0-9.=-]+$/);
  });
});

describe("validateCheckoutDetails", () => {
  it("requires name and phone but not email", () => {
    expect(Object.keys(validateCheckoutDetails({ name: "", phone: "", email: "" })).sort()).toEqual([
      "name",
      "phone",
    ]);
    expect(validateCheckoutDetails({ name: "Ada", phone: "08030000000", email: "" })).toEqual({});
  });

  it("rejects a malformed optional email and a missing delivery address", () => {
    const errors = validateCheckoutDetails(
      { name: "Ada", phone: "08030000000", email: "nope" },
      { method: "DELIVERY", address: "" },
    );
    expect(errors.email).toBeDefined();
    expect(errors.deliveryAddress).toBeDefined();
  });
});
