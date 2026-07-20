export type DocumentType = "SUPPLIER_INVOICE" | "CUSTOMER_RECEIPT";

export interface DocumentLineDraft {
  description: string;
  quantity: number;
  unitPrice: number;
  productVariantId?: string;
}

export interface DocumentFingerprint {
  sha256: string;
  supplierName?: string;
  invoiceNumber?: string;
  total?: number;
}

export function detectDocumentDuplicate(
  candidate: DocumentFingerprint,
  existing: DocumentFingerprint[],
) {
  return existing.some(
    (document) =>
      document.sha256 === candidate.sha256 ||
      (!!candidate.supplierName &&
        !!candidate.invoiceNumber &&
        document.supplierName?.toLocaleLowerCase() === candidate.supplierName.toLocaleLowerCase() &&
        document.invoiceNumber === candidate.invoiceNumber &&
        document.total === candidate.total),
  );
}

export function approveDocumentDraft(input: { type: DocumentType; lines: DocumentLineDraft[] }) {
  if (input.lines.length === 0) throw new Error("Document must contain at least one line");
  if (input.lines.some((line) => line.quantity <= 0 || line.unitPrice < 0)) {
    throw new Error("Document line values are invalid");
  }

  if (input.type === "CUSTOMER_RECEIPT") {
    return { orderMode: "HISTORICAL" as const, inventoryMovements: [] };
  }

  if (input.lines.some((line) => !line.productVariantId)) {
    throw new Error("Every supplier line must be matched before approval");
  }

  return {
    orderMode: null,
    inventoryMovements: input.lines.map((line) => ({
      productVariantId: line.productVariantId!,
      quantity: line.quantity,
      unitCost: line.unitPrice,
      type: "PURCHASE_RECEIPT" as const,
    })),
  };
}
