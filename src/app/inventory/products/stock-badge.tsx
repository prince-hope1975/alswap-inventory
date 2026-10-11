import { stockStatus } from "~/lib/domain/product-list-params";

const tone = {
  untracked: "bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-200",
  out: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  low: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  ok: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
} as const;

export function InventoryStockBadge({
  stockQuantity,
  lowStockThreshold,
}: {
  stockQuantity: number;
  lowStockThreshold: number | null;
}) {
  const status = stockStatus(stockQuantity, lowStockThreshold);
  const label =
    status === "untracked"
      ? "Untracked"
      : status === "out"
        ? "Out of stock"
        : status === "low"
          ? `${stockQuantity} left (low)`
          : `${stockQuantity} in stock`;

  return (
    <span
      title={status === "untracked" ? "Quantity unknown. Set a count to start tracking." : undefined}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${tone[status]}`}
    >
      {label}
    </span>
  );
}
