import { describe, expect, it } from "vitest";

import { containsPattern, ORDER_SEARCH_MAX } from "./order-search";

describe("containsPattern", () => {
  it("wraps the trimmed term in wildcards", () => {
    expect(containsPattern("  ada ")).toBe("%ada%");
  });

  it("escapes LIKE wildcards and backslashes", () => {
    expect(containsPattern("50%_off\\")).toBe("%50\\%\\_off\\\\%");
  });

  it("returns null for blank input", () => {
    expect(containsPattern("   ")).toBeNull();
    expect(containsPattern(undefined)).toBeNull();
  });

  it("caps the length", () => {
    expect(containsPattern("x".repeat(500))!.length).toBe(ORDER_SEARCH_MAX + 2);
  });
});
