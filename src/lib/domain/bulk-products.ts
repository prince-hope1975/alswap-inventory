import { z } from "zod";

/** Most products one bulk action may touch (one list page is 50). */
export const BULK_PRODUCT_LIMIT = 200;

/** Product ids for a bulk action: trimmed, de-duplicated, 1..BULK_PRODUCT_LIMIT. */
export const bulkProductIdsSchema = z
  .array(z.string().trim().min(1).max(255))
  .min(1, "Select at least one product")
  // Hard cap on the raw payload before de-duplication.
  .max(BULK_PRODUCT_LIMIT * 5)
  .transform((ids) => Array.from(new Set(ids)))
  .refine((ids) => ids.length <= BULK_PRODUCT_LIMIT, {
    message: `Select at most ${BULK_PRODUCT_LIMIT} products at a time`,
  });

export const bulkSetCategoryInput = z.object({
  ids: bulkProductIdsSchema,
  categoryId: z.number().int().positive(),
});

export const bulkDeleteInput = z.object({ ids: bulkProductIdsSchema });

/** Toast text for a bulk delete that may have skipped products with history. */
export function bulkDeleteSummary(deleted: number, skipped: number) {
  const d = `Deleted ${deleted} product${deleted === 1 ? "" : "s"}`;
  if (skipped === 0) return d;
  return `${d}. Kept ${skipped} with sales, purchase or stock history.`;
}
