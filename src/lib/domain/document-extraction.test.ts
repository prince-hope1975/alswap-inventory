import { describe, expect, it } from "vitest";

import { normalizeDocumentExtraction } from "./document-extraction";

describe("normalizeDocumentExtraction", () => {
  it("turns provider output into an editable, calculated draft", () => {
    expect(
      normalizeDocumentExtraction({
        type: "supplier_invoice",
        supplierName: "  Cable House ",
        invoiceNumber: " INV-41 ",
        lines: [{ description: "2.5mm cable", quantity: "3", unitPrice: "1250.50" }],
      }),
    ).toMatchObject({
      type: "SUPPLIER_INVOICE",
      supplierName: "Cable House",
      invoiceNumber: "INV-41",
      total: 3751.5,
      lines: [{ description: "2.5mm cable", quantity: 3, unitPrice: 1250.5 }],
    });
  });

  it("rejects unsafe or empty provider output", () => {
    expect(() => normalizeDocumentExtraction({ lines: [] })).toThrow("usable line");
    expect(() =>
      normalizeDocumentExtraction({ lines: [{ description: "Cable", quantity: -1, unitPrice: 5 }] }),
    ).toThrow("positive quantity");
  });
});
