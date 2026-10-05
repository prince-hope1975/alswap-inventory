/**
 * Pure helpers behind the Dialog focus trap, kept DOM-light so they can be
 * unit tested.
 */

export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/** Tabbable descendants of `root`, in DOM order, skipping hidden/inert ones. */
export function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.closest("[inert]") && el.getAttribute("aria-hidden") !== "true" && !el.hidden,
  );
}

/**
 * Where Tab should move focus inside a trap of `count` tabbables, given the
 * index of the focused one (-1 = focus is outside the trap). Returns the index
 * to focus, or null to let the browser move focus normally.
 */
export function trapTabTarget(count: number, currentIndex: number, shiftKey: boolean): number | null {
  if (count <= 0) return null;
  if (currentIndex < 0) return shiftKey ? count - 1 : 0;
  if (shiftKey && currentIndex === 0) return count - 1;
  if (!shiftKey && currentIndex === count - 1) return 0;
  return null;
}

/**
 * Open-dialog stack: only the topmost dialog reacts to Esc / Tab, and the
 * body scroll lock is released only when the last dialog closes.
 */
const stack: symbol[] = [];
let lockCount = 0;
let savedOverflow = "";
let savedPaddingRight = "";

export function pushDialog(id: symbol) {
  stack.push(id);
}

export function popDialog(id: symbol) {
  const i = stack.lastIndexOf(id);
  if (i >= 0) stack.splice(i, 1);
}

export function isTopDialog(id: symbol) {
  return stack[stack.length - 1] === id;
}

export function lockBodyScroll() {
  if (typeof document === "undefined") return;
  lockCount += 1;
  if (lockCount > 1) return;
  const body = document.body;
  savedOverflow = body.style.overflow;
  savedPaddingRight = body.style.paddingRight;
  // Keep layout from shifting when the scrollbar disappears.
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
  body.style.overflow = "hidden";
}

export function unlockBodyScroll() {
  if (typeof document === "undefined" || lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;
  document.body.style.overflow = savedOverflow;
  document.body.style.paddingRight = savedPaddingRight;
}
