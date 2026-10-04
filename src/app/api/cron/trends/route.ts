import { eq } from "drizzle-orm";

import { env } from "~/env";
import { db } from "~/server/db";
import { trendTerms } from "~/server/db/schema";
import { refreshTrends } from "~/server/trends/refresh";

export const dynamic = "force-dynamic";
// A run is a handful of Google calls with pauses between them.
export const maxDuration = 60;

/**
 * Daily Vercel cron (see vercel.json). Each run refreshes the stalest slice
 * of every tenant's watchlist, so the full list cycles over a few days.
 */
export async function GET(request: Request) {
  // Vercel sends the secret as a bearer token. With no secret configured the
  // route stays closed rather than letting anyone burn our Google quota.
  if (!env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const tenantIds = await db
    .selectDistinct({ tenantId: trendTerms.tenantId })
    .from(trendTerms)
    .where(eq(trendTerms.isActive, true));

  const results: Record<string, unknown> = {};
  for (const { tenantId } of tenantIds) {
    results[tenantId] = await refreshTrends(db, tenantId, "cron");
  }
  return Response.json(results);
}
