import { createHmac, timingSafeEqual } from "node:crypto";

import { toKobo } from "./checkout";

/**
 * Pure Paystack rules (server-side only: uses node:crypto). Kept free of DB
 * and env imports so the finalizer decision and webhook signature check are
 * unit testable.
 */

export type PaystackVerification = {
  ok: boolean;
  status?: string;
  /** Amount paid, in kobo. */
  amount?: number;
  reference?: string;
  message?: string;
};

export type FinalizeDecision =
  | { action: "complete" }
  | { action: "already_completed" }
  | { action: "needs_attention"; reason: string }
  | { action: "retry"; reason: string }
  | { action: "reject"; reason: string };

/**
 * Decide what the finalizer does with a verified Paystack transaction. The DB
 * update is still conditional on `PENDING`, so a race between the client
 * verify and the webhook resolves to a single completion either way.
 */
export function decideFinalization(input: {
  orderStatus: "PENDING" | "COMPLETED" | "CANCELLED";
  orderTotal: number | string;
  reference: string;
  verification: PaystackVerification;
}): FinalizeDecision {
  if (input.orderStatus === "COMPLETED") return { action: "already_completed" };

  const v = input.verification;
  if (!v.ok) {
    return { action: "reject", reason: v.message ?? "Payment was not successful." };
  }
  if (v.status !== "success") {
    if (v.status === "failed" || v.status === "abandoned" || v.status === "reversed") {
      return { action: "reject", reason: "Payment was not successful." };
    }
    return { action: "retry", reason: "Payment verification is not yet conclusive." };
  }
  if (v.reference !== input.reference) {
    return { action: "reject", reason: "Payment reference mismatch." };
  }
  if (typeof v.amount !== "number" || v.amount !== toKobo(input.orderTotal)) {
    return { action: "reject", reason: "Payment amount mismatch." };
  }
  // Money arrived for an order staff (or a failed init) already cancelled.
  // Don't silently revive it and move stock; a person has to look.
  if (input.orderStatus === "CANCELLED") {
    return {
      action: "needs_attention",
      reason: "Payment received for a cancelled order.",
    };
  }
  return { action: "complete" };
}

/** HMAC-SHA512 of the raw body with the tenant secret key, as Paystack signs webhooks. */
export function verifyPaystackSignature(
  rawBody: string,
  signature: string | null | undefined,
  secretKey: string | null | undefined,
) {
  if (!signature || !secretKey) return false;
  const expected = createHmac("sha512", secretKey).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim().toLowerCase(), "utf8");
  // timingSafeEqual throws on unequal lengths; a malformed header is a 401, not a 500.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
