"use client";

import { useMemo, useState } from "react";
import { Check, FileScan, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";

import { api } from "~/trpc/react";

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

function isDraft(value: unknown): value is Draft {
  return !!value && typeof value === "object" && Array.isArray((value as Draft).lines);
}

export default function DocumentsPage() {
  const [selectedId, setSelectedId] = useState<string>();
  const [draft, setDraft] = useState<Draft>();
  const [message, setMessage] = useState("");
  const utils = api.useUtils();
  const jobs = api.documents.list.useQuery();
  const variants = api.documents.listVariants.useQuery();
  const refresh = () => void utils.documents.list.invalidate();
  const upload = api.documents.uploadAndExtract.useMutation({ onSuccess: (job) => {
    refresh();
    setSelectedId(job?.id);
    if (isDraft(job?.draft)) setDraft(job.draft);
    setMessage("Extraction ready. Review every line before approval.");
  }, onError: (error) => setMessage(error.message) });
  const save = api.documents.saveDraft.useMutation({ onSuccess: () => { refresh(); setMessage("Draft saved."); } });
  const approve = api.documents.approve.useMutation({ onSuccess: () => { refresh(); setMessage("Approved and posted successfully."); } });

  const total = useMemo(() => draft?.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0) ?? 0, [draft]);

  async function onFile(file?: File) {
    if (!file) return;
    setMessage("Reading and extracting document…");
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
    upload.mutate({ fileName: file.name, mimeType: file.type as "image/jpeg", base64 });
  }

  function selectJob(job: NonNullable<typeof jobs.data>[number]) {
    setSelectedId(job.id);
    setDraft(isDraft(job.draft) ? structuredClone(job.draft) : undefined);
    setMessage(job.failureMessage ?? "");
  }

  function updateLine(index: number, patch: Partial<DraftLine>) {
    if (!draft) return;
    setDraft({ ...draft, lines: draft.lines.map((line, i) => i === index ? { ...line, ...patch } : line) });
  }

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-8">
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-primary-600)]">Document inbox</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">Receipt & invoice OCR</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">Upload a scan, review the extracted fields, match products, then approve. Nothing changes stock before approval.</p>
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary-600)] px-5 py-3 font-semibold text-white shadow-sm hover:opacity-90 focus-within:ring-2 focus-within:ring-[var(--brand-primary-500)] focus-within:ring-offset-2">
          {upload.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          Upload document
          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={upload.isPending} onChange={(event) => void onFile(event.target.files?.[0])} />
        </label>
      </header>

      {message && <div role="status" className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{message}</div>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section aria-label="Uploaded documents" className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {jobs.isLoading && <p className="p-4 text-sm text-gray-500">Loading documents…</p>}
          {!jobs.isLoading && !jobs.data?.length && <div className="p-8 text-center"><FileScan className="mx-auto mb-3 h-9 w-9 text-gray-400" /><p className="font-medium">No documents yet</p><p className="mt-1 text-sm text-gray-500">Upload the first receipt or invoice.</p></div>}
          <div className="space-y-2">
            {jobs.data?.map((job) => (
              <button key={job.id} onClick={() => selectJob(job)} className={`w-full rounded-xl border p-3 text-left transition ${selectedId === job.id ? "border-[var(--brand-primary-500)] bg-[var(--brand-primary-50)]" : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"}`}>
                <span className="block truncate text-sm font-semibold">{job.fileName}</span>
                <span className="mt-1 flex justify-between text-xs text-gray-500"><span>{job.type?.replaceAll("_", " ") ?? "Detecting type"}</span><span>{job.status.replaceAll("_", " ")}</span></span>
              </button>
            ))}
          </div>
        </section>

        <section aria-label="Document editor" className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          {!draft ? <div className="py-20 text-center text-gray-500"><FileScan className="mx-auto mb-4 h-12 w-12" /><p>Select an extracted document to review it.</p></div> : <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm font-medium">Document type<select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Draft["type"] })} className="mt-1 min-h-11 w-full rounded-lg border bg-transparent px-3"><option value="SUPPLIER_INVOICE">Supplier invoice</option><option value="CUSTOMER_RECEIPT">Customer receipt</option></select></label>
              <label className="text-sm font-medium">{draft.type === "SUPPLIER_INVOICE" ? "Supplier" : "Customer"}<input value={draft.type === "SUPPLIER_INVOICE" ? draft.supplierName ?? "" : draft.customerName ?? ""} onChange={(e) => setDraft(draft.type === "SUPPLIER_INVOICE" ? { ...draft, supplierName: e.target.value } : { ...draft, customerName: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border bg-transparent px-3" /></label>
              <label className="text-sm font-medium">Reference<input value={draft.invoiceNumber ?? ""} onChange={(e) => setDraft({ ...draft, invoiceNumber: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border bg-transparent px-3" /></label>
              <label className="text-sm font-medium">Date<input type="date" value={draft.date ?? ""} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border bg-transparent px-3" /></label>
            </div>

            <div className="mt-7 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-gray-500"><th className="pb-3">Description</th><th className="pb-3">Qty</th><th className="pb-3">Unit price</th><th className="pb-3">Product match</th><th><span className="sr-only">Remove</span></th></tr></thead><tbody>{draft.lines.map((line, index) => <tr key={index} className="border-b last:border-0"><td className="py-3 pr-2"><input aria-label={`Line ${index + 1} description`} value={line.description} onChange={(e) => updateLine(index, { description: e.target.value })} className="min-h-10 w-full rounded-lg border bg-transparent px-2" /></td><td className="py-3 pr-2"><input aria-label={`Line ${index + 1} quantity`} type="number" min="0.001" step="any" value={line.quantity} onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })} className="min-h-10 w-24 rounded-lg border bg-transparent px-2" /></td><td className="py-3 pr-2"><input aria-label={`Line ${index + 1} unit price`} type="number" min="0" step="0.01" value={line.unitPrice} onChange={(e) => updateLine(index, { unitPrice: Number(e.target.value) })} className="min-h-10 w-32 rounded-lg border bg-transparent px-2" /></td><td className="py-3 pr-2"><select aria-label={`Line ${index + 1} product match`} value={line.productVariantId ?? ""} onChange={(e) => updateLine(index, { productVariantId: e.target.value || undefined })} className="min-h-10 w-full rounded-lg border bg-transparent px-2"><option value="">Choose product…</option>{variants.data?.map((variant) => <option value={variant.id} key={variant.id}>{variant.name}{variant.sku ? ` · ${variant.sku}` : ""}</option>)}</select></td><td><button aria-label={`Remove line ${index + 1}`} onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_, i) => i !== index) })} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>
            <button onClick={() => setDraft({ ...draft, lines: [...draft.lines, { description: "", quantity: 1, unitPrice: 0 }] })} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold"><Plus className="h-4 w-4" />Add line</button>
            <div className="mt-7 flex flex-col items-start justify-between gap-4 border-t pt-5 sm:flex-row sm:items-center"><div><p className="text-sm text-gray-500">Calculated total</p><p className="text-2xl font-bold">₦{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div><div className="flex gap-3"><button disabled={save.isPending} onClick={() => selectedId && save.mutate({ id: selectedId, draft: { ...draft, total } })} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 font-semibold disabled:opacity-50"><Save className="h-4 w-4" />Save draft</button><button disabled={approve.isPending || save.isPending} onClick={() => selectedId && save.mutate({ id: selectedId, draft: { ...draft, total } }, { onSuccess: () => approve.mutate({ id: selectedId }) })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4" />Approve & post</button></div></div>
          </>}
        </section>
      </div>
    </main>
  );
}
