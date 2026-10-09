"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

import { Dialog, DialogFooter } from "./dialog";
import { btnDanger, btnPrimary, btnSecondary } from "./styles";

export type ConfirmOptions = {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for destructive actions. */
  destructive?: boolean;
};

type ConfirmDialogProps = ConfirmOptions & {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
};

/** Controlled confirm dialog. Prefer `useConfirm()` for one-off prompts. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
  pending = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} title={title} hideClose>
      {message && <div className="text-sm text-gray-600 dark:text-gray-300">{message}</div>}
      <DialogFooter>
        {/* Cancel first in DOM so it gets initial focus: safer for destructive prompts. */}
        <button type="button" onClick={onCancel} className={btnSecondary} data-autofocus>
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={destructive ? btnDanger : btnPrimary}
        >
          {pending ? "Working…" : confirmLabel}
        </button>
      </DialogFooter>
    </Dialog>
  );
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Mount once near the root; `useConfirm()` then works anywhere below it. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    resolveRef.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={options !== null}
        title={options?.title ?? ""}
        message={options?.message}
        confirmLabel={options?.confirmLabel}
        cancelLabel={options?.cancelLabel}
        destructive={options?.destructive}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    </ConfirmContext.Provider>
  );
}

/**
 * Promise-based replacement for window.confirm():
 * `if (await confirm({ title: "Delete?", destructive: true })) ...`
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}
