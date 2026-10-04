import { describe, expect, it } from "vitest";
import {
  comparisonBatches,
  momentum,
  normalizeSearchTerm,
  scoreAgainstAnchor,
} from "./demand";

describe("normalizeSearchTerm", () => {
  it("folds case and whitespace onto one key", () => {
    expect(normalizeSearchTerm("  Solar   PANEL ")).toBe("solar panel");
  });

  it("rejects terms too short or too long to be useful", () => {
    expect(normalizeSearchTerm("a")).toBeNull();
    expect(normalizeSearchTerm("x".repeat(81))).toBeNull();
  });

  it("rejects input with no letters", () => {
    expect(normalizeSearchTerm("200")).toBeNull();
    expect(normalizeSearchTerm("??")).toBeNull();
  });

  it("keeps model numbers that contain letters", () => {
    expect(normalizeSearchTerm("200Ah")).toBe("200ah");
  });
});

describe("scoreAgainstAnchor", () => {
  it("scores a term relative to the anchor's mean", () => {
    expect(scoreAgainstAnchor([30, 30], [15, 15]).yearScore).toBe(200);
  });

  it("uses only the recent window for the recent score", () => {
    const anchor = Array<number>(52).fill(10);
    const term = [...Array<number>(44).fill(0), ...Array<number>(8).fill(20)];
    const { yearScore, recentScore } = scoreAgainstAnchor(term, anchor);
    expect(recentScore).toBe(200);
    expect(yearScore).toBeLessThan(recentScore);
  });

  it("returns zero instead of dividing by an empty anchor", () => {
    expect(scoreAgainstAnchor([5], [0])).toEqual({ yearScore: 0, recentScore: 0 });
  });
});

describe("momentum", () => {
  it("classifies large moves and treats small ones as steady", () => {
    expect(momentum(100, 150)).toBe("rising");
    expect(momentum(100, 50)).toBe("falling");
    expect(momentum(100, 110)).toBe("steady");
    expect(momentum(0, 0)).toBe("unknown");
    expect(momentum(0, 12)).toBe("rising");
  });
});

describe("comparisonBatches", () => {
  it("leaves one slot per batch for the anchor", () => {
    expect(comparisonBatches([1, 2, 3, 4, 5, 6])).toEqual([[1, 2, 3, 4], [5, 6]]);
  });
});
