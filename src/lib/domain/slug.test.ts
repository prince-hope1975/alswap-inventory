import { describe, expect, it } from "vitest";
import { createSlug } from "./slug";

describe("createSlug", () => {
  it("creates stable SEO paths from product names", () => {
    expect(createSlug("  2.5mm² Copper Cable — Red  ")).toBe("2-5mm-copper-cable-red");
  });
});
