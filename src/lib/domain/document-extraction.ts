import { z } from "zod";

const providerExtractionSchema = z.object({
  type: z.string().optional(),
  supplierName: z.string().optional(),
  customerName: z.string().optional(),
  invoiceNumber: z.string().optional(),
  date: z.string().optional(),
  total: z.coerce.number().nonnegative().optional(),
  lines: z
    .array(
      z.object({
        description: z.string().trim().min(1),
        quantity: z.coerce.number().positive("Each line needs a positive quantity"),
        unitPrice: z.coerce.number().nonnegative(),
        sku: z.string().optional(),
      }),
    )
    .min(1, "Document does not contain a usable line"),
});

export type DocumentExtractionDraft = ReturnType<typeof normalizeDocumentExtraction>;

export function normalizeDocumentExtraction(value: unknown) {
  const parsed = providerExtractionSchema.parse(value);
  const lines = parsed.lines.map((line) => ({
    description: line.description.trim(),
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    ...(line.sku?.trim() ? { sku: line.sku.trim() } : {}),
  }));
  const calculatedTotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const normalizedType = parsed.type?.toUpperCase();

  return {
    type: normalizedType === "CUSTOMER_RECEIPT" ? ("CUSTOMER_RECEIPT" as const) : ("SUPPLIER_INVOICE" as const),
    supplierName: parsed.supplierName?.trim() || undefined,
    customerName: parsed.customerName?.trim() || undefined,
    invoiceNumber: parsed.invoiceNumber?.trim() || undefined,
    date: parsed.date?.trim() || undefined,
    total: parsed.total ?? calculatedTotal,
    lines,
  };
}
