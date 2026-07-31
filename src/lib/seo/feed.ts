import "server-only";

import { and, asc, eq, gt, isNotNull, ne } from "drizzle-orm";

import { db } from "~/server/db";
import { products } from "~/server/db/schema";

export { escapeXml, feedCondition } from "~/lib/seo/feed-format";

const FEED_BATCH_SIZE = 500;

export type FeedProduct = Awaited<ReturnType<typeof fetchFeedBatch>>[number];

function fetchFeedBatch(tenantId: string, afterId: string | undefined) {
  return db.query.products.findMany({
    where: and(
      eq(products.tenantId, tenantId),
      eq(products.visibility, "PUBLISHED"),
      eq(products.feedEligible, true),
      ne(products.stockQuantity, 0),
      isNotNull(products.image),
      afterId ? gt(products.id, afterId) : undefined,
    ),
    orderBy: asc(products.id),
    limit: FEED_BATCH_SIZE,
  });
}

/**
 * Streams the feed-eligible catalog in batches rather than loading the whole
 * table at once — `inventory.listProducts` and `findSimilarProducts` both
 * load everything, which is fine at admin-list scale but not for a feed that
 * must page an arbitrarily large catalog.
 */
export async function* iterateFeedProducts(tenantId: string) {
  let afterId: string | undefined;
  for (;;) {
    const batch = await fetchFeedBatch(tenantId, afterId);
    if (batch.length === 0) return;
    for (const product of batch) yield product;
    if (batch.length < FEED_BATCH_SIZE) return;
    afterId = batch[batch.length - 1]!.id;
  }
}
