import { sql } from "drizzle-orm";

import { orders } from "~/server/db/schema";

/**
 * SQL twin of `countsAsSale` (src/lib/domain/order-status.ts): excludes
 * cancelled orders and Paystack orders still awaiting payment. Use in every
 * revenue / sales / top-seller aggregate.
 */
export function countsAsSaleSql() {
  return sql`(${orders.status} <> 'CANCELLED' and not (coalesce(${orders.paymentMethod}, '') = 'PAYSTACK' and ${orders.status} = 'PENDING'))`;
}
