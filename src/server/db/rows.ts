/**
 * Normalise the result of `db.execute()` across the two supported transports.
 *
 * This project can run on either drizzle adapter (see DATABASE_TRANSPORT in
 * src/server/db/index.ts), and they disagree on the shape of a raw query
 * result: `postgres-js` resolves to an array-like RowList, while
 * `neon-serverless` resolves to a pg-style `{ rows: [...] }` object. Code that
 * assumes one shape throws "rows.map is not a function" on the other.
 */
export function toRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: unknown } | null)?.rows;
  return Array.isArray(rows) ? (rows as T[]) : [];
}
