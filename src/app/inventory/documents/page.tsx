"use client";

import { useId, useMemo, useState } from "react";
import { Check, CheckCircle2, FileScan, Info, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";

import { api } from "~/trpc/react";
import { toast } from "~/lib/toast";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { cn } from "~/lib/utils";
import { useConfirm } from "~/components/ui/confirm-dialog";
import { LoadError } from "~/components/ui/load-error";
import { SkeletonRows } from "~/components/ui/skeleton";
import { btnPrimary, btnSecondary, iconBtn, inputCls, labelCls, rowFocus } from "~/components/ui/styles";
import { VariantCombobox } from "./variant-combobox";

type DraftLine = { description: string; quantity: number; unitPrice: number; sku?: string; productVariantId?: string };
type Draft = {
  type: "SUPPLIER_INVOICE" | "CUSTOMER_RECEIPT";
  supplierName?: string;
  customerName?: string;
  invoiceNumber?: string;
  date?: string;
  total: number;
  lines: DraftLine[];
};

const STATUS_LABEL: Record<string, string> = {
  UPLOADED: "Uploaded",
  QUEUED: "Queued",
  PROCESSING: "Processing",
  REVIEW: "Needs review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  FAILED: "Failed",
};
const STATUS_TONE: Record<string, string> = {
  REVIEW: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};
const TYPE_LABEL: Record<string, string> = {
  SUPPLIER_INVOICE: "Supplier invoice",
  CUSTOMER_RECEIPT: "Customer receipt",
};

function isDraft(value: unknown): value is Draft {
  return !!value && typeof value === "object" && Array.isArray((value as Draft).lines);
}

type Banner = { tone: "info" | "error" | "success"; text: string } | null;

const bannerTone = {
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-100",
  error: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-100",
};

export default function DocumentsPage() {
  const uid = useId();
  const [selectedId, setSelectedId] = useState<string>();
  const [draft, setDraft] = useState<Draft>();
  const [banner, setBanner] = useState<Banner>(null);
  const utils = api.useUtils();
  const confirm = useConfirm();
  const { formatCurrency } = useCurrency();
  const jobs = api.documents.list.useQuery();
  const variants = api.documents.listVariants.useQuery();
  const refresh = () => void utils.documents.list.invalidate();

  // Status messages go to the banner; toasts only for the explicit Save /
  // Approve clicks, so one action never produces two notices.
  const upload = api.documents.uploadAndExtract.useMutation({
    onSuccess: (job) => {
      refresh();
      setSelectedId(job?.id);
      if (isDraft(job?.draft)) setDraft(job.draft);
      setBanner({ tone: "info", text: "Extraction ready. Review every line before approval." });
    },
    onError: (error) => setBanner({ tone: "error", text: `Extraction failed: ${error.message}` }),
  });
  const save = api.documents.saveDraft.useMutation({ onSuccess: refresh });
  const approve = api.documents.approve.useMutation({
    onSuccess: () => {
      refresh();
      setBanner({ tone: "success", text: "Approved and posted. Stock and costs have been updated." });
    },
    onError: (error) => setBanner({ tone: "error", text: `Could not approve: ${error.message}` }),
  });

  const selectedJob = jobs.data?.find((job) => job.id === selectedId);
  const approved = selectedJob?.status === "APPROVED";
  const busy = save.isPending || approve.isPending;
  const total = useMemo(() => draft?.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0) ?? 0, [draft]);
  const unmatched = draft?.lines.filter((l) => !l.productVariantId).length ?? 0;
  // The server rejects supplier invoices with unmatched lines; say so up front.
  const blockedByMatching = draft?.type === "SUPPLIER_INVOICE" && unmatched > 0;

  async function onFile(file?: File) {
    if (!file) return;
    setBanner({ tone: "info", text: "Reading and extracting document…" });
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? (reader.result.split(",")[1] ?? "") : "");
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
    upload.mutate({ fileName: file.name, mimeType: file.type as "image/jpeg", base64 });
  }

  function selectJob(job: NonNullable<typeof jobs.data>[number]) {
    setSelectedId(job.id);
    setDraft(isDraft(job.draft) ? structuredClone(job.draft) : undefined);
    setBanner(job.failureMessage ? { tone: "error", text: job.failureMessage } : null);
  }

  function updateLine(index: number, patch: Partial<DraftLine>) {
    if (!draft) return;
    setDraft({ ...draft, lines: draft.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)) });
  }

  function saveDraft() {
    if (!selectedId || !draft) return;
    save.mutate(
      { id: selectedId, draft: { ...draft, total } },
      {
        onSuccess: () => toast.success("Draft saved"),
        onError: (error) => toast.error(`Could not save draft: ${error.message}`),
      },
    );
  }

  async function approveAndPost() {
    if (!selectedId || !draft || approved || blockedByMatching) return;
    const ok = await confirm({
      title: "Approve and post this document?",
      message:
        draft.type === "SUPPLIER_INVOICE"
          ? "Every line is received into stock and its average cost is updated. This cannot be undone."
          : "The receipt is recorded as a historical sale for your reports. Stock is not changed. This cannot be undone.",
      confirmLabel: "Approve & post",
    });
    if (!ok) return;
    const id = selectedId;
    save.mutate(
      { id, draft: { ...draft, total } },
      {
        onSuccess: () => approve.mutate({ id }),
        onError: (error) => setBanner({ tone: "error", text: `Could not save before approving: ${error.message}` }),
      },
    );
  }

  const field = (name: string) => `${uid}-${name}`;
  const readOnly = approved || busy;

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-[var(--brand-primary-600)] uppercase dark:text-[var(--brand-primary-400)]">
            Document inbox
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Receipt & invoice OCR</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
            Upload a scan, review the extracted fields, match products, then approve. Nothing changes stock before
            approval.
          </p>
        </div>
        <label
          className={cn(
            btnPrimary,
            "min-h-11 cursor-pointer focus-within:ring-2 focus-within:ring-[var(--brand-primary-focus)]",
            upload.isPending && "pointer-events-none opacity-60",
          )}
        >
          {upload.isPending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Upload className="h-5 w-5" aria-hidden="true" />}
          {upload.isPending ? "Extracting…" : "Upload document"}
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            disabled={upload.isPending}
            onChange={(event) => {
              void onFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      </header>

      {banner && (
        <div role={banner.tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-2 rounded-xl border px-4 py-3 text-sm", bannerTone[banner.tone])}>
          {banner.tone === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section aria-label="Uploaded documents" className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {jobs.error ? (
            <LoadError
              title="Couldn't load documents."
              message={jobs.error.message}
              onRetry={() => void jobs.refetch()}
              retrying={jobs.isRefetching}
            />
          ) : jobs.isLoading ? (
            <div className="p-3">
              <SkeletonRows rows={4} label="Loading documents" />
            </div>
          ) : !jobs.data?.length ? (
            <div className="p-8 text-center">
              <FileScan className="mx-auto mb-3 h-9 w-9 text-gray-400" aria-hidden="true" />
              <p className="font-medium text-gray-900 dark:text-white">No documents yet</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Upload the first receipt or invoice.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {jobs.data.map((job) => (
                <li key={job.id}>
                  <button
                    type="button"
                    onClick={() => selectJob(job)}
                    aria-current={selectedId === job.id ? "true" : undefined}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left transition",
                      rowFocus,
                      selectedId === job.id
                        ? "border-[var(--brand-primary-500)] bg-[var(--brand-primary-50)] dark:bg-[var(--brand-primary-900)]/20"
                        : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50",
                    )}
                  >
                    <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">{job.fileName}</span>
                    <span className="mt-1.5 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{job.type ? (TYPE_LABEL[job.type] ?? job.type) : "Detecting type"}</span>
                      <span className={cn("rounded-full px-2 py-0.5 font-semibold", STATUS_TONE[job.status] ?? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200")}>
                        {STATUS_LABEL[job.status] ?? job.status}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Document editor" className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 dark:border-gray-700 dark:bg-gray-800">
          {!draft ? (
            <div className="py-20 text-center text-gray-500 dark:text-gray-400">
              <FileScan className="mx-auto mb-4 h-12 w-12" aria-hidden="true" />
              <p>Select an extracted document to review it.</p>
            </div>
          ) : (
            <fieldset disabled={readOnly} className="min-w-0">
              <legend className="sr-only">Extracted document</legend>
              {approved && (
                <p className="mb-5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100">
                  This document has been approved and posted. It can no longer be edited.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor={field("type")} className={labelCls}>Document type</label>
                  <select id={field("type")} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Draft["type"] })} className={cn(inputCls, "mt-1 min-h-11")}>
                    <option value="SUPPLIER_INVOICE">Supplier invoice</option>
                    <option value="CUSTOMER_RECEIPT">Customer receipt</option>
                  </select>
                </div>
                <div>
                  <label htmlFor={field("party")} className={labelCls}>{draft.type === "SUPPLIER_INVOICE" ? "Supplier" : "Customer"}</label>
                  <input
                    id={field("party")}
                    value={draft.type === "SUPPLIER_INVOICE" ? (draft.supplierName ?? "") : (draft.customerName ?? "")}
                    onChange={(e) => setDraft(draft.type === "SUPPLIER_INVOICE" ? { ...draft, supplierName: e.target.value } : { ...draft, customerName: e.target.value })}
                    className={cn(inputCls, "mt-1 min-h-11")}
                  />
                </div>
                <div>
                  <label htmlFor={field("ref")} className={labelCls}>Reference</label>
                  <input id={field("ref")} value={draft.invoiceNumber ?? ""} onChange={(e) => setDraft({ ...draft, invoiceNumber: e.target.value })} className={cn(inputCls, "mt-1 min-h-11")} />
                </div>
                <div>
                  <label htmlFor={field("date")} className={labelCls}>Date</label>
                  <input id={field("date")} type="date" value={draft.date ?? ""} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className={cn(inputCls, "mt-1 min-h-11")} />
                </div>
              </div>

              <div className="mt-7 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs tracking-wide text-gray-500 uppercase dark:border-gray-700 dark:text-gray-400">
                      <th className="pb-3 font-medium">Description</th>
                      <th className="pb-3 font-medium">Qty</th>
                      <th className="pb-3 font-medium">Unit price</th>
                      <th className="pb-3 font-medium">Product match</th>
                      <th className="pb-3"><span className="sr-only">Remove</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.lines.map((line, index) => (
                      <tr key={index} className="border-b border-gray-100 last:border-0 dark:border-gray-700">
                        <td className="py-3 pr-2">
                          <input aria-label={`Line ${index + 1} description`} value={line.description} onChange={(e) => updateLine(index, { description: e.target.value })} className={cn(inputCls, "min-h-10")} />
                        </td>
                        <td className="py-3 pr-2">
                          <input aria-label={`Line ${index + 1} quantity`} type="number" min="0.001" step="any" value={line.quantity} onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })} className={cn(inputCls, "min-h-10 w-24")} />
                        </td>
                        <td className="py-3 pr-2">
                          <input aria-label={`Line ${index + 1} unit price`} type="number" min="0" step="0.01" value={line.unitPrice} onChange={(e) => updateLine(index, { unitPrice: Number(e.target.value) })} className={cn(inputCls, "min-h-10 w-32")} />
                        </td>
                        <td className="w-72 py-3 pr-2">
                          <VariantCombobox
                            label={`Line ${index + 1} product match`}
                            options={variants.data ?? []}
                            loading={variants.isLoading}
                            value={line.productVariantId}
                            onChange={(id) => updateLine(index, { productVariantId: id })}
                          />
                        </td>
                        <td className="py-3">
                          <button
                            type="button"
                            aria-label={`Remove line ${index + 1}`}
                            onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_, i) => i !== index) })}
                            className={`${iconBtn} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {variants.error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">Couldn&apos;t load products to match: {variants.error.message}</p>
              )}
              <button
                type="button"
                onClick={() => setDraft({ ...draft, lines: [...draft.lines, { description: "", quantity: 1, unitPrice: 0 }] })}
                className={cn(btnSecondary, "mt-4")}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add line
              </button>

              <div className="mt-7 flex flex-col items-start justify-between gap-4 border-t border-gray-200 pt-5 sm:flex-row sm:items-center dark:border-gray-700">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Calculated total</p>
                  <p className="text-2xl font-bold text-gray-900 tabular-nums dark:text-white">{formatCurrency(total)}</p>
                  {unmatched > 0 && !approved && (
                    <p id={field("unmatched")} className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                      {unmatched} line{unmatched === 1 ? "" : "s"} not matched to a product
                      {blockedByMatching && ". Match every line of a supplier invoice before approving."}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={saveDraft} className={cn(btnSecondary, "min-h-11")}>
                    {save.isPending && !approve.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                    Save draft
                  </button>
                  <button
                    type="button"
                    onClick={() => void approveAndPost()}
                    disabled={blockedByMatching}
                    aria-describedby={blockedByMatching ? field("unmatched") : undefined}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-500 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {approve.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                    {approved ? "Approved" : approve.isPending ? "Posting…" : "Approve & post"}
                  </button>
                </div>
              </div>
            </fieldset>
          )}
        </section>
      </div>
    </div>
  );
}
