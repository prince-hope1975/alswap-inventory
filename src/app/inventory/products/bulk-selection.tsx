"use client";

import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Layers, Trash2, X } from "lucide-react";

import { api } from "~/trpc/react";
import { toast } from "~/lib/toast";
import { bulkDeleteSummary } from "~/lib/domain/bulk-products";
import { useConfirm } from "~/components/ui/confirm-dialog";
import { Dialog, DialogFooter } from "~/components/ui/dialog";
import { btnDanger, btnPrimary, btnSecondary, checkboxCls, inputCls, labelCls } from "~/components/ui/styles";

type Ctx = {
  selected: Set<string>;
  pageIds: string[];
  toggle: (id: string) => void;
  setAll: (on: boolean) => void;
  clear: () => void;
};

const SelectionContext = createContext<Ctx | null>(null);

function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("Bulk selection components must be inside <BulkSelectionProvider>");
  return ctx;
}

/** Holds the checked product ids for the current page of the list. */
export function BulkSelectionProvider({ pageIds, children }: { pageIds: string[]; children: ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const key = pageIds.join(",");

  // A new page / filter result drops ids that are no longer listed.
  useEffect(() => {
    setSelected((prev) => {
      const visible = new Set(key ? key.split(",") : []);
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [key]);

  const value = useMemo<Ctx>(
    () => ({
      selected,
      pageIds,
      toggle: (id) =>
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      setAll: (on) => setSelected(on ? new Set(pageIds) : new Set()),
      clear: () => setSelected(new Set()),
    }),
    [selected, pageIds],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function RowCheckbox({ id, name }: { id: string; name: string }) {
  const { selected, toggle } = useSelection();
  return (
    <input
      type="checkbox"
      checked={selected.has(id)}
      onChange={() => toggle(id)}
      aria-label={`Select ${name}`}
      // Above the row's stretched edit link.
      className={`relative z-10 ${checkboxCls}`}
    />
  );
}

export function SelectAllCheckbox() {
  const { selected, pageIds, setAll } = useSelection();
  const ref = useRef<HTMLInputElement>(null);
  const all = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const some = !all && pageIds.some((id) => selected.has(id));
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some;
  }, [some]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={all}
      onChange={(e) => setAll(e.target.checked)}
      disabled={pageIds.length === 0}
      aria-label="Select all products on this page"
      className={checkboxCls}
    />
  );
}

/** Sticky bar shown while products are selected. */
export function BulkActionBar({
  categories,
  canDelete,
}: {
  categories: { id: number; name: string }[];
  canDelete: boolean;
}) {
  const { selected, clear } = useSelection();
  const router = useRouter();
  const utils = api.useUtils();
  const confirm = useConfirm();
  const selectId = useId();
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const ids = [...selected];
  const count = ids.length;

  const done = () => {
    clear();
    void utils.inventory.getLowStockProducts.invalidate();
    void utils.inventory.getDashboardStats.invalidate();
    router.refresh();
  };

  const setCategory = api.inventory.bulkSetCategory.useMutation({
    onSuccess: (r) => {
      toast.success(`Moved ${r.updated} product${r.updated === 1 ? "" : "s"} to ${r.categoryName}`);
      setCategoryOpen(false);
      setCategoryId("");
      done();
    },
    onError: (e) => toast.error(`Could not set category: ${e.message}`),
  });

  const bulkDelete = api.inventory.bulkDeleteProducts.useMutation({
    onSuccess: (r) => {
      if (r.skipped > 0) toast.warning(bulkDeleteSummary(r.deleted, r.skipped));
      else toast.success(bulkDeleteSummary(r.deleted, r.skipped));
      done();
    },
    onError: (e) => toast.error(`Could not delete products: ${e.message}`),
  });

  async function onDelete() {
    const ok = await confirm({
      title: `Delete ${count} product${count === 1 ? "" : "s"}?`,
      message:
        "They are removed from your catalog and shop. Products with sales, purchase or stock history are kept. This cannot be undone.",
      confirmLabel: `Delete ${count}`,
      destructive: true,
    });
    if (ok) bulkDelete.mutate({ ids });
  }

  if (count === 0) return null;

  return (
    <>
      <div
        role="region"
        aria-label="Bulk actions"
        className="sticky bottom-4 z-30 mx-auto flex w-full max-w-3xl flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-xl dark:border-gray-700 dark:bg-gray-800"
      >
        <p className="text-sm font-medium text-gray-900 dark:text-white" aria-live="polite">
          {count} selected
        </p>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setCategoryOpen(true)} className={btnSecondary} disabled={categories.length === 0}>
            <Layers className="h-4 w-4" aria-hidden="true" />
            Set category
          </button>
          {canDelete && (
            <button type="button" onClick={() => void onDelete()} disabled={bulkDelete.isPending} className={btnDanger}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {bulkDelete.isPending ? "Deleting…" : "Delete"}
            </button>
          )}
          <button
            type="button"
            onClick={clear}
            aria-label="Clear selection"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] focus-visible:outline-none dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <Dialog
        open={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        title="Set category"
        description={`Applies to ${count} selected product${count === 1 ? "" : "s"} and replaces their current categories.`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const id = Number(categoryId);
            if (id > 0) setCategory.mutate({ ids, categoryId: id });
          }}
        >
          <label htmlFor={selectId} className={labelCls}>
            Category
          </label>
          <select
            id={selectId}
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={`mt-1 ${inputCls}`}
          >
            <option value="">Choose a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <DialogFooter>
            <button type="button" onClick={() => setCategoryOpen(false)} className={btnSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={!categoryId || setCategory.isPending} className={btnPrimary}>
              {setCategory.isPending ? "Saving…" : "Apply"}
            </button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
