import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useDebouncedValue } from "./use-debounced-value";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("history-restored debounced filters", () => {
  it("restores search and price together without stale timers overwriting them", async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ search, price, revision }) => ({
        search: useDebouncedValue(search, 300, revision),
        price: useDebouncedValue(price, 400, revision),
      }),
      { initialProps: { search: "cable", price: 500, revision: 0 } },
    );
    rerender({ search: "battery", price: 900, revision: 0 });
    expect(result.current).toEqual({ search: "cable", price: 500 });

    // Back restores both fields while a typed edit is still queued.
    rerender({ search: "bulb", price: 200, revision: 1 });
    expect(result.current).toEqual({ search: "bulb", price: 200 });
    await act(() => vi.advanceTimersByTime(500));
    expect(result.current).toEqual({ search: "bulb", price: 200 });

    // Ordinary typing still debounces after restoration.
    rerender({ search: "solar", price: 700, revision: 1 });
    expect(result.current).toEqual({ search: "bulb", price: 200 });
    await act(() => vi.advanceTimersByTime(300));
    expect(result.current).toEqual({ search: "solar", price: 200 });
    await act(() => vi.advanceTimersByTime(100));
    expect(result.current).toEqual({ search: "solar", price: 700 });
  });
});
