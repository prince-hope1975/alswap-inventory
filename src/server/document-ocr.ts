import { GoogleGenerativeAI } from "@google/generative-ai";

import { normalizeDocumentExtraction } from "~/lib/domain/document-extraction";

export async function extractDocumentWithGemini(input: { base64: string; mimeType: string }) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not configured");

  const modelName = process.env.GOOGLE_GEMINI_OCR_MODEL ?? "gemini-2.0-flash";
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json", temperature: 0 },
  });
  const result = await model.generateContent([
    `Extract this supplier invoice or customer receipt. Return JSON only with: type (SUPPLIER_INVOICE or CUSTOMER_RECEIPT), supplierName, customerName, invoiceNumber, date (YYYY-MM-DD where possible), total, and lines. Each line must have description, quantity, unitPrice, and optional sku. Never invent missing values; use a quantity of 1 only when the receipt clearly shows one item without a quantity.`,
    { inlineData: { data: input.base64, mimeType: input.mimeType } },
  ]);
  const rawText = result.response.text();
  const raw = JSON.parse(rawText.replace(/^```json\s*|\s*```$/g, "")) as unknown;
  return { draft: normalizeDocumentExtraction(raw), raw, provider: "gemini", model: modelName };
}
