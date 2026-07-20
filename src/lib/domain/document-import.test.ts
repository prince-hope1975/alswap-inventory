import { describe, expect, it } from "vitest";

import { approveDocumentDraft, detectDocumentDuplicate } from "./document-import";

describe("document import safety", () => {
  it("keeps customer receipt imports historical and stock-neutral", () => {
    const result = approveDocumentDraft({
      type: "CUSTOMER_RECEIPT",
      lines: [{ description: "LED bulb", quantity: 2, unitPrice: 1500, productVariantId: "variant-1" }],
    });

    expect(result.orderMode).toBe("HISTORICAL");
    expect(result.inventoryMovements).toEqual([]);
  });

  it("creates stock receipts only for fully matched supplier lines", () => {
    expect(() =>
      approveDocumentDraft({
        type: "SUPPLIER_INVOICE",
        lines: [{ description: "Cable roll", quantity: 1, unitPrice: 50000 }],
      }),
    ).toThrow("Every supplier line must be matched before approval");
  });

  it("detects the same file or invoice signature as a duplicate", () => {
    expect(
      detectDocumentDuplicate(
        { sha256: "same", supplierName: "ACME", invoiceNumber: "42", total: 9000 },
        [{ sha256: "same", supplierName: "Other", invoiceNumber: "1", total: 1 }],
      ),
    ).toBe(true);
  });
});
