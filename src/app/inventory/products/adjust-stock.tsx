"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";

import { api } from "~/trpc/react";
import { toast } from "~/lib/toast";
import { computeStockAdjustment, type StockAdjustMode } from "~/lib/domain/stock-adjust";

const modes: { value: StockAdjustMode; label: string; reasonHint: string }[] = [
  { value: "receive", label: "Received", reasonHint: "e.g. Delivery from supplier" },
  { value: "remove", label: "Removed", reasonHint: "e.g. Damaged, expired, lost" },
  { value: "set", label: "Set count", reasonHint: "e.g. Shelf count" },
];

const inputCls =
  "mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[var(--brand-primary-500)] focus:ring-2 focus:ring-[var(--brand-primary-focus)] focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white";

export function AdjustStockButton({
  productId,
  productName,
  stockQuantity,
}: {
  productId: string;
  productName: string;
  stockQuantity: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Adjust stock for ${productName}`}
        title="Adjust stock"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] focus-visible:outline-none dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>
      {/* Portal: the row's z-10 stacking context would otherwise let later
          rows paint over the dialog. Only rendered after a click, so no SSR. */}
      {open &&
        createPortal(
          <AdjustStockDialog
            productId={productId}
            productName={productName}
            stockQuantity={stockQuantity}
            onClose={() => setOpen(false)}
          />,
          document.body,
        )}
    </>
  );
}

function AdjustStockDialog({
  productId,
  productName,
  stockQuantity,
  onClose,
}: {
  productId: string;
  productName: string;
  stockQuantity: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const titleId = useId();
  const untracked = stockQuantity < 0;
  const [mode, setMode] = useState<StockAdjustMode>(untracked ? "set" : "receive");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const amountRef = useRef<HTMLInputElement>(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    amountRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, []);

  const updateStock = api.inventory.updateStock.useMutation({
    onSuccess: (r) => {
      toast.success(r.changed ? `${productName}: stock now ${r.newQuantity}` : "No change to stock");
      void utils.inventory.getLowStockProducts.invalidate();
      void utils.inventory.getDashboardStats.invalidate();
      router.refresh();
      onClose();
    },
    onError: (e) => toast.error(`Could not adjust stock: ${e.message}`),
  });

  const parsed = amount.trim() === "" ? null : Number(amount);
  const preview = parsed === null ? null : computeStockAdjustment({ current: stockQuantity, mode, amount: parsed });
  const current = modes.find((m) => m.value === mode)!;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview?.ok || parsed === null) return;
    updateStock.mutate({ id: productId, mode, amount: parsed, reason: reason.trim() || undefined });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={submit}
        className="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-2xl dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="font-semibold text-gray-900 dark:text-white">
              Adjust stock
            </h2>
            <p className="truncate text-sm text-gray-500 dark:text-gray-400">{productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
          Current stock: <strong>{untracked ? "Untracked" : stockQuantity}</strong>
        </p>

        <div role="radiogroup" aria-label="Adjustment type" className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-900">
          {modes.map((m) => {
            const disabled = untracked && m.value !== "set";
            return (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={mode === m.value}
                disabled={disabled}
                onClick={() => setMode(m.value)}
                className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  mode === m.value
                    ? "bg-white text-[var(--brand-primary-700)] shadow-sm dark:bg-gray-700 dark:text-[var(--brand-primary-300)]"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        {untracked && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            This product&apos;s stock is untracked. Set a count to start tracking it.
          </p>
        )}

        <label className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {mode === "set" ? "Counted quantity" : "Quantity"}
          <input
            ref={amountRef}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputCls}
          />
        </label>

        <label className="mt-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Reason <span className="font-normal text-gray-400">(optional)</span>
          <input
            type="text"
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={current.reasonHint}
            className={inputCls}
          />
        </label>

        <p aria-live="polite" className="mt-3 min-h-5 text-sm">
          {preview === null ? null : preview.ok ? (
            <span className="text-gray-700 dark:text-gray-300">
              New stock: <strong>{preview.newQuantity}</strong>
            </span>
          ) : (
            <span className="text-red-600 dark:text-red-400">{preview.error}</span>
          )}
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!preview?.ok || updateStock.isPending}
            className="rounded-lg bg-[var(--brand-primary-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
          >
            {updateStock.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
