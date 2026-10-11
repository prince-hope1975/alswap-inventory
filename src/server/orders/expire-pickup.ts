import { and, eq, lte } from "drizzle-orm";
import type { db as appDb } from "~/server/db";
import { orders } from "~/server/db/schema";
import { changeOrderStatus } from "./change-status";

/** Bounded batches; lazy callers reconcile only their own tenant. */
export async function expirePickupReservations(
  database: typeof appDb,
  tenantId?: string,
  now = new Date(),
) {
  const overdue = await database
    .select({ id: orders.id, tenantId: orders.tenantId })
    .from(orders)
    .where(
      and(
        eq(orders.status, "PENDING"),
        eq(orders.paymentMethod, "PAY_ON_PICKUP"),
        lte(orders.expiresAt, now),
        tenantId ? eq(orders.tenantId, tenantId) : undefined,
      ),
    )
    .limit(500);
  for (const order of overdue)
    await changeOrderStatus(
      database,
      order.tenantId,
      order.id,
      "CANCELLED",
      now,
    );
  return overdue.length;
}
