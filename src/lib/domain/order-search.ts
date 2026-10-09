/** Longest order search term accepted (also the zod bound). */
export const ORDER_SEARCH_MAX = 100;

/**
 * Turns a user's search text into an ILIKE "contains" pattern, escaping the
 * LIKE wildcards (% and _) and the escape character itself so they match
 * literally. Returns null for blank input.
 */
export function containsPattern(term: string | null | undefined): string | null {
  const t = term?.trim().slice(0, ORDER_SEARCH_MAX);
  if (!t) return null;
  return `%${t.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
