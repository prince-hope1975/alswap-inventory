"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "~/lib/utils";
import {
  getFocusable,
  isTopDialog,
  lockBodyScroll,
  popDialog,
  pushDialog,
  trapTabTarget,
  unlockBodyScroll,
} from "./focus-trap";

type Variant = "center" | "right" | "left";

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  /** Visible heading; also the dialog's accessible name unless `ariaLabel` is set. */
  title: ReactNode;
  description?: ReactNode;
  /** Use instead of the title as the accessible name (e.g. when the title is a logo). */
  ariaLabel?: string;
  children?: ReactNode;
  /** centre modal (default) or a full-height drawer from the right / left. */
  variant?: Variant;
  /** Extra classes for the panel (width etc.). */
  className?: string;
  /** Element to focus on open; otherwise the first [data-autofocus], then the first field/button in the body. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeOnBackdrop?: boolean;
  /** Hide the header close button (Esc and the backdrop still close). */
  hideClose?: boolean;
  closeLabel?: string;
  /** Classes for the body wrapper (default adds padding). */
  bodyClassName?: string;
};

const panelByVariant: Record<Variant, string> = {
  center:
    "relative flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl transition duration-150 starting:scale-95 starting:opacity-0 dark:border-gray-700 dark:bg-gray-800",
  right:
    "absolute inset-y-0 right-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl transition-transform duration-200 starting:translate-x-full dark:bg-gray-900",
  left:
    "absolute inset-y-0 left-0 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-200 starting:-translate-x-full dark:bg-gray-900",
};

/**
 * Accessible modal dialog: portal to <body>, role="dialog" + aria-modal,
 * labelled by its title, Esc to close, focus moved in and trapped, focus
 * restored on close, body scroll locked. Nested dialogs stack: only the top
 * one handles Esc/Tab.
 */
export function Dialog(props: DialogProps) {
  // Render nothing on the server / before mount so portals never mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !props.open) return null;
  return createPortal(<DialogInner {...props} />, document.body);
}

function DialogInner({
  onClose,
  title,
  description,
  ariaLabel,
  children,
  variant = "center",
  className,
  initialFocusRef,
  closeOnBackdrop = true,
  hideClose = false,
  closeLabel = "Close",
  bodyClassName,
}: DialogProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const id = Symbol("dialog");
    const previouslyFocused = document.activeElement as HTMLElement | null;
    pushDialog(id);
    lockBodyScroll();

    const panel = panelRef.current;
    const explicit = initialFocusRef?.current ?? panel?.querySelector<HTMLElement>("[data-autofocus]");
    // Drawers hold content plus action buttons: never auto-focus (and scroll
    // to) an action there; start at the close button / panel instead.
    const target =
      explicit ??
      (variant === "center"
        ? ((bodyRef.current ? getFocusable(bodyRef.current)[0] : undefined) ??
          (panel ? getFocusable(panel)[0] : undefined) ??
          panel)
        : (closeRef.current ?? panel));
    target?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (!isTopDialog(id) || !panelRef.current) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = getFocusable(panelRef.current);
      if (focusables.length === 0) {
        e.preventDefault();
        panelRef.current.focus();
        return;
      }
      const idx = focusables.indexOf(document.activeElement as HTMLElement);
      const next = trapTabTarget(focusables.length, idx, e.shiftKey);
      if (next !== null) {
        e.preventDefault();
        focusables[next]?.focus();
      }
    };
    // Capture phase: runs before any handler can stop propagation.
    document.addEventListener("keydown", onKey, true);

    return () => {
      document.removeEventListener("keydown", onKey, true);
      popDialog(id);
      unlockBodyScroll();
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={cn("fixed inset-0 z-50", variant === "center" && "flex items-end justify-center p-4 sm:items-center")}
      // React events bubble through portals along the component tree: stop
      // this dialog's submits from reaching an enclosing <form> (e.g. the
      // product form around the adjust-stock or crop dialogs).
      onSubmit={(e) => e.stopPropagation()}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px] transition-opacity duration-150 starting:opacity-0"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabel ? undefined : titleId}
        aria-label={ariaLabel}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(panelByVariant[variant], "focus:outline-none", className)}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            {description && (
              <div id={descId} className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {description}
              </div>
            )}
          </div>
          {!hideClose && (
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="-mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] focus-visible:outline-none dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
        <div ref={bodyRef} className={cn("min-h-0 flex-1 overflow-y-auto", bodyClassName ?? "p-5")}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Right-aligned footer row for dialog actions. */
export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mt-5 flex flex-wrap justify-end gap-2", className)}>{children}</div>;
}
