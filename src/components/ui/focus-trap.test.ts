import { describe, expect, it } from "vitest";

import { trapTabTarget } from "./focus-trap";

describe("trapTabTarget", () => {
  it("wraps forward from the last element to the first", () => {
    expect(trapTabTarget(3, 2, false)).toBe(0);
  });

  it("wraps backward from the first element to the last", () => {
    expect(trapTabTarget(3, 0, true)).toBe(2);
  });

  it("lets the browser handle moves inside the trap", () => {
    expect(trapTabTarget(3, 0, false)).toBeNull();
    expect(trapTabTarget(3, 1, true)).toBeNull();
  });

  it("pulls focus back in when it is outside the trap", () => {
    expect(trapTabTarget(3, -1, false)).toBe(0);
    expect(trapTabTarget(3, -1, true)).toBe(2);
  });

  it("does nothing with no tabbable elements", () => {
    expect(trapTabTarget(0, -1, false)).toBeNull();
  });

  it("keeps a single element focused", () => {
    expect(trapTabTarget(1, 0, false)).toBe(0);
    expect(trapTabTarget(1, 0, true)).toBe(0);
  });
});
