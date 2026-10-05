import { and, eq, lt } from "drizzle-orm";

import { env } from "~/env";
import { db } from "~/server/db";
import { orders } from "~/server/db/schema";

export const dynamic = "force-dynamic";

/** Abandoned online checkouts older than this are cancelled. */
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

/**
 * Daily Vercel cron (see vercel.json). Cancels PAYSTACK + PENDING orders that
 * never got paid, so abandoned checkouts don't pile up. Stock is untouched:
 * Paystack orders only take stock when payment finalizes. If a payment does
 * arrive later, the finalizer flags the cancelled order for staff attention.
 */
export async function GET(request: Request) {
  // Same guard as the trends cron: closed when no secret is configured.
  if (!env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  const cancelled = await db
    .update(orders)
    .set({ status: "CANCELLED" })
    .where(and(
      eq(orders.paymentMethod, "PAYSTACK"),
      eq(orders.status, "PENDING"),
      lt(orders.createdAt, cutoff),
    ))
    .returning({ id: orders.id });

  return Response.json({ cancelled: cancelled.length, cutoff: cutoff.toISOString() });
}
