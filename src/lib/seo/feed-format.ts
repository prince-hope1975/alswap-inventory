/**
 * Pure feed-formatting helpers, kept free of `server-only`/db imports so they
 * can be unit tested directly. `feed.ts` (DB-backed) re-exports these.
 */

/**
 * Escapes for XML text/attribute content. Distinct from the HTML-escaping in
 * `json-ld.tsx` — XML additionally requires `'` and `"` escaped even in text
 * nodes when a naive parser treats them the same as attribute values.
 */
export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function feedCondition(condition: "NEW" | "USED" | "REFURBISHED") {
  return condition === "NEW" ? "new" : condition === "USED" ? "used" : "refurbished";
}
