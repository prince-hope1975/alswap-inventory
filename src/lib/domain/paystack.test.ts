// @vitest-environment node
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { decideFinalization, verifyPaystackSignature } from "./paystack";

const ok = { ok: true, status: "success", amount: 1_250_000, reference: "ps-1" };

describe("decideFinalization", () => {
  it("completes a pending order whose payment matches", () => {
    expect(
      decideFinalization({ orderStatus: "PENDING", orderTotal: "12500.00", reference: "ps-1", verification: ok }),
    ).toEqual({ action: "complete" });
  });

  it("is a no-op for an order that's already completed (replay)", () => {
    expect(
      decideFinalization({ orderStatus: "COMPLETED", orderTotal: "12500.00", reference: "ps-1", verification: ok }),
    ).toEqual({ action: "already_completed" });
  });

  it("rejects an amount mismatch", () => {
    const result = decideFinalization({
      orderStatus: "PENDING",
      orderTotal: "12500.00",
      reference: "ps-1",
      verification: { ...ok, amount: 100 },
    });
    expect(result).toEqual({ action: "reject", reason: "Payment amount mismatch." });
  });

  it("rejects a failed or abandoned transaction", () => {
    expect(
      decideFinalization({
        orderStatus: "PENDING",
        orderTotal: "12500",
        reference: "ps-1",
        verification: { ...ok, status: "abandoned" },
      }).action,
    ).toBe("reject");
    expect(
      decideFinalization({
        orderStatus: "PENDING",
        orderTotal: "12500",
        reference: "ps-1",
        verification: { ok: false, message: "Transaction not found" },
      }),
    ).toEqual({ action: "reject", reason: "Transaction not found" });
  });

  it("rejects a reference mismatch", () => {
    expect(
      decideFinalization({
        orderStatus: "PENDING",
        orderTotal: "12500",
        reference: "ps-1",
        verification: { ...ok, reference: "ps-2" },
      }).action,
    ).toBe("reject");
  });

  it("flags money arriving for a cancelled order instead of reviving it", () => {
    expect(
      decideFinalization({ orderStatus: "CANCELLED", orderTotal: "12500", reference: "ps-1", verification: ok }).action,
    ).toBe("needs_attention");
  });
});

describe("verifyPaystackSignature", () => {
  const secret = "sk_test_abc";
  const body = JSON.stringify({ event: "charge.success", data: { reference: "ps-1" } });
  const signature = createHmac("sha512", secret).update(body).digest("hex");

  it("accepts the HMAC-SHA512 of the raw body", () => {
    expect(verifyPaystackSignature(body, signature, secret)).toBe(true);
  });

  it("rejects a tampered body, wrong key or missing header", () => {
    expect(verifyPaystackSignature(body.replace("ps-1", "ps-2"), signature, secret)).toBe(false);
    expect(verifyPaystackSignature(body, signature, "sk_test_other")).toBe(false);
    expect(verifyPaystackSignature(body, null, secret)).toBe(false);
    expect(verifyPaystackSignature(body, signature, null)).toBe(false);
  });

  it("returns false (not throw) for a malformed signature length", () => {
    expect(verifyPaystackSignature(body, "abc", secret)).toBe(false);
  });
});
