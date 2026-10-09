"use client";

import { cn } from "~/lib/utils";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import { api } from "~/trpc/react";
import { toast } from "~/lib/toast";
import { computeStockAdjustment, type StockAdjustMode } from "~/lib/domain/stock-adjust";
import { Dialog, DialogFooter } from "~/components/ui/dialog";
import { btnPrimary, btnSecondary, iconBtn, inputCls } from "~/components/ui/styles";

const modes: { value: StockAdjustMode; label: string; reasonHint: string }[] = [
  { value: "receive", label: "Received", reasonHint: "e.g. Delivery from supplier" },
  { value: "remove", label: "Removed", reasonHint: "e.g. Damaged, expired, lost" },
  { value: "set", label: "Set count", reasonHint: "e.g. Shelf count" },
];

export function AdjustStockButton({
  productId,
  productName,
  stockQuantity,
  showLabel = false,
}: {
  productId: string;
  productName: string;
  stockQuantity: number;
  /** Text button ("Adjust stock") instead of an icon-only one. */
  showLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {showLabel ? (
        <button type="button" onClick={() => setOpen(true)} className={cn(btnSecondary, "px-3 py-1.5")}>
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Adjust stock
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Adjust stock for ${productName}`}
          className={`${iconBtn} text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white`}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title="Adjust stock" description={productName} className="max-w-sm">
        <AdjustStockForm
          productId={productId}
          productName={productName}
          stockQuantity={stockQuantity}
          onClose={() => setOpen(false)}
        />
      </Dialog>
    </>
  );
}

function AdjustStockForm({
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
  const untracked = stockQuantity < 0;
  const [mode, setMode] = useState<StockAdjustMode>(untracked ? "set" : "receive");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const amountRef = useRef<HTMLInputElement>(null);

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
    <form onSubmit={submit} className="text-left">
      <p className="text-sm text-gray-700 dark:text-gray-300">
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
              onClick={() => {
                setMode(m.value);
                amountRef.current?.focus();
              }}
              className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
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
          data-autofocus
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={`mt-1 ${inputCls}`}
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
          className={`mt-1 ${inputCls}`}
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

      <DialogFooter>
        <button type="button" onClick={onClose} className={btnSecondary}>
          Cancel
        </button>
        <button type="submit" disabled={!preview?.ok || updateStock.isPending} className={btnPrimary}>
          {updateStock.isPending ? "Saving…" : "Save"}
        </button>
      </DialogFooter>
    </form>
  );
}
