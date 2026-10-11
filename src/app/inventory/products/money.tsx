"use client";

import { useCurrency } from "~/hooks/use-tenant-settings";

/** Formats a price with the tenant currency (client-side, works for managers). */
export function Money({ amount }: { amount: string | number | null | undefined }) {
  const { formatCurrency } = useCurrency();
  return <>{formatCurrency(amount)}</>;
}
