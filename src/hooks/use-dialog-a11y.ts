"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Focus management for storefront dialogs and drawers that keep their own
 * look (the shared `~/components/ui/dialog` forces a back-office header).
 *
 * While `open`:
 * - moves focus into the panel (`initialFocusRef`, then `[data-autofocus]`,
 *   then the first tabbable element, then the panel itself);
 * - keeps Tab / Shift+Tab inside the panel;
 * - closes on Esc;
 * - locks body scroll;
 * and on close restores focus to whatever opened it.
 *
 * Only the topmost open dialog reacts to keys, so a drawer opened from the
 * quick view (or checkout opened from the drawer) behaves. Set `paused` while
 * a third-party overlay (Paystack's iframe) owns the screen: the trap and Esc
 * stand down so they never pull focus out of the payment form.
 *
 * Call it unconditionally, before any early `return null`.
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function getTabbable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      !el.closest("[inert]") &&
      !el.closest("[aria-hidden='true']") &&
      // Skip elements hidden with display:none (e.g. `hidden sm:flex`).
      (el.offsetParent !== null || el === document.activeElement),
  );
}

/**
 * Index to focus when Tab is pressed inside a trap of `count` elements with
 * `current` focused (-1 = outside). null = let the browser handle it.
 */
export function nextTrapIndex(count: number, current: number, shiftKey: boolean): number | null {
  if (count <= 0) return null;
  if (current < 0) return shiftKey ? count - 1 : 0;
  if (shiftKey && current === 0) return count - 1;
  if (!shiftKey && current === count - 1) return 0;
  return null;
}

const stack: symbol[] = [];
let lockCount = 0;
let savedOverflow = "";
let savedPaddingRight = "";

function lockScroll() {
  lockCount += 1;
  if (lockCount > 1) return;
  const body = document.body;
  savedOverflow = body.style.overflow;
  savedPaddingRight = body.style.paddingRight;
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
  body.style.overflow = "hidden";
}

function unlockScroll() {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;
  document.body.style.overflow = savedOverflow;
  document.body.style.paddingRight = savedPaddingRight;
}

export function useDialogA11y({
  open,
  onClose,
  panelRef,
  initialFocusRef,
  paused = false,
}: {
  open: boolean;
  /** Omit (or pass undefined) to make Esc do nothing, e.g. mid-payment. */
  onClose?: () => void;
  panelRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  paused?: boolean;
}) {
  const onCloseRef = useRef(onClose);
  const pausedRef = useRef(paused);
  useEffect(() => {
    onCloseRef.current = onClose;
    pausedRef.current = paused;
  });

  useEffect(() => {
    if (!open) return;
    const id = Symbol("dialog");
    const previouslyFocused = document.activeElement as HTMLElement | null;
    stack.push(id);
    lockScroll();

    const panel = panelRef.current;
    const target =
      initialFocusRef?.current ??
      panel?.querySelector<HTMLElement>("[data-autofocus]") ??
      (panel ? getTabbable(panel)[0] : undefined) ??
      panel;
    // preventScroll: a bottom sheet should not jump the page behind it.
    target?.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id || pausedRef.current) return;
      const current = panelRef.current;
      if (!current) return;
      if (event.key === "Escape") {
        if (!onCloseRef.current) return;
        event.stopPropagation();
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const tabbable = getTabbable(current);
      if (tabbable.length === 0) {
        event.preventDefault();
        current.focus();
        return;
      }
      const index = tabbable.indexOf(document.activeElement as HTMLElement);
      const next = nextTrapIndex(tabbable.length, index, event.shiftKey);
      if (next !== null) {
        event.preventDefault();
        tabbable[next]?.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);

    return () => {
      document.removeEventListener("keydown", onKey, true);
      const at = stack.lastIndexOf(id);
      if (at >= 0) stack.splice(at, 1);
      unlockScroll();
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
    // Refs are stable; re-running on every render would steal focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
