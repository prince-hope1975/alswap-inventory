import { describe, expect, it } from "vitest";

import { computeStockAdjustment, nextVariantStock } from "./stock-adjust";

describe("computeStockAdjustment", () => {
  it("adds received stock as a purchase receipt", () => {
    expect(computeStockAdjustment({ current: 4, mode: "receive", amount: 5 })).toEqual({
      ok: true,
      noop: false,
      newQuantity: 9,
      delta: 5,
      movementType: "PURCHASE_RECEIPT",
    });
  });

  it("removes damaged stock as a negative adjustment", () => {
    expect(computeStockAdjustment({ current: 4, mode: "remove", amount: 3 })).toEqual({
      ok: true,
      noop: false,
      newQuantity: 1,
      delta: -3,
      movementType: "ADJUSTMENT",
    });
  });

  it("allows removing down to exactly zero", () => {
    const r = computeStockAdjustment({ current: 4, mode: "remove", amount: 4 });
    expect(r).toMatchObject({ ok: true, newQuantity: 0, delta: -4 });
  });

  it("rejects removals that go below zero, including landing on the -1 sentinel", () => {
    expect(computeStockAdjustment({ current: 4, mode: "remove", amount: 5 }).ok).toBe(false);
    expect(computeStockAdjustment({ current: 0, mode: "remove", amount: 1 }).ok).toBe(false);
  });

  it("records a count variance when setting a count", () => {
    expect(computeStockAdjustment({ current: 10, mode: "set", amount: 7 })).toEqual({
      ok: true,
      noop: false,
      newQuantity: 7,
      delta: -3,
      movementType: "COUNT_VARIANCE",
    });
  });

  it("treats a set to the same count as a no-op", () => {
    expect(computeStockAdjustment({ current: 7, mode: "set", amount: 7 })).toEqual({
      ok: true,
      noop: true,
      newQuantity: 7,
    });
  });

  it("treats a zero receive/remove as a no-op", () => {
    expect(computeStockAdjustment({ current: 7, mode: "receive", amount: 0 })).toMatchObject({ noop: true });
    expect(computeStockAdjustment({ current: 7, mode: "remove", amount: 0 })).toMatchObject({ noop: true });
  });

  it("opens a balance from 0 when counting an untracked product", () => {
    expect(computeStockAdjustment({ current: -1, mode: "set", amount: 12 })).toEqual({
      ok: true,
      noop: false,
      newQuantity: 12,
      delta: 12,
      movementType: "OPENING_BALANCE",
    });
    // Counting zero on an untracked product still starts tracking it.
    expect(computeStockAdjustment({ current: -1, mode: "set", amount: 0 })).toMatchObject({
      noop: false,
      newQuantity: 0,
      delta: 0,
      movementType: "OPENING_BALANCE",
    });
  });

  it("rejects receive/remove on untracked stock", () => {
    expect(computeStockAdjustment({ current: -1, mode: "receive", amount: 2 }).ok).toBe(false);
    expect(computeStockAdjustment({ current: -1, mode: "remove", amount: 2 }).ok).toBe(false);
  });

  it("rejects negative and fractional amounts", () => {
    expect(computeStockAdjustment({ current: 3, mode: "receive", amount: -2 }).ok).toBe(false);
    expect(computeStockAdjustment({ current: 3, mode: "set", amount: 1.5 }).ok).toBe(false);
  });
});

describe("nextVariantStock", () => {
  it("clamps a legacy -1 variant stock to 0 before applying the delta", () => {
    expect(nextVariantStock("-1.000", 5)).toBe("5");
    expect(nextVariantStock("3.000", -2)).toBe("1");
  });
});
