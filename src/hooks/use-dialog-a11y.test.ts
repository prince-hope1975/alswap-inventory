import { describe, expect, it } from "vitest";

import { renderHook } from "@testing-library/react";

import { useDialogA11y, nextTrapIndex } from "./use-dialog-a11y";

describe("nextTrapIndex", () => {
  it("wraps Tab from the last element to the first", () => {
    expect(nextTrapIndex(3, 2, false)).toBe(0);
  });

  it("wraps Shift+Tab from the first element to the last", () => {
    expect(nextTrapIndex(3, 0, true)).toBe(2);
  });

  it("pulls focus back in when it is outside the dialog", () => {
    expect(nextTrapIndex(3, -1, false)).toBe(0);
    expect(nextTrapIndex(3, -1, true)).toBe(2);
  });

  it("lets the browser move focus in the middle, and ignores empty traps", () => {
    expect(nextTrapIndex(3, 1, false)).toBeNull();
    expect(nextTrapIndex(0, -1, false)).toBeNull();
  });
});

it("returns focus to a stable control when a dialog handoff removes its trigger", () => {
  const fallback = document.createElement("button");
  fallback.id = "stable-cart";
  document.body.append(fallback);
  const panel = document.createElement("div");
  panel.tabIndex = -1;
  document.body.append(panel);
  const { unmount } = renderHook(() =>
    useDialogA11y({
      open: true,
      panelRef: { current: panel },
      returnFocusSelector: "#stable-cart",
    }),
  );
  unmount();
  expect(document.activeElement).toBe(fallback);
  fallback.remove();
  panel.remove();
});
