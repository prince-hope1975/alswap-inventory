import { describe, expect, it } from "vitest";

import { toRows } from "./rows";

describe("toRows", () => {
  it("passes through the array that postgres-js returns", () => {
    expect(toRows<{ id: string }>([{ id: "a" }, { id: "b" }])).toEqual([
      { id: "a" },
      { id: "b" },
    ]);
  });

  it("unwraps the { rows } object that neon-serverless returns", () => {
    expect(toRows<{ id: string }>({ rows: [{ id: "a" }], rowCount: 1 })).toEqual([
      { id: "a" },
    ]);
  });

  it("returns an empty array for shapes it cannot read", () => {
    expect(toRows(null)).toEqual([]);
    expect(toRows(undefined)).toEqual([]);
    expect(toRows({})).toEqual([]);
    expect(toRows({ rows: "not-an-array" })).toEqual([]);
  });
});
