"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

import { api } from "~/trpc/react";
import { toast } from "~/lib/toast";
import { AdjustStockButton } from "./adjust-stock";

const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] focus-visible:outline-none";

export function ProductActions({
  id,
  name,
  stockQuantity,
  canDelete,
}: {
  id: string;
  name: string;
  stockQuantity: number;
  canDelete: boolean;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const deleteProduct = api.inventory.deleteProduct.useMutation({
    onSuccess: () => {
      toast.success(`Deleted ${name}`);
      void utils.inventory.getLowStockProducts.invalidate();
      router.refresh();
    },
    onError: (e) => toast.error(`Could not delete product: ${e.message}`),
  });

  const handleDelete = () => {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
      deleteProduct.mutate({ id });
    }
  };

  return (
    <div className="relative z-10 flex justify-end gap-1">
      <AdjustStockButton productId={id} productName={name} stockQuantity={stockQuantity} />
      <Link
        href={`/inventory/products/${id}`}
        aria-label={`Edit ${name}`}
        title="Edit"
        className={`${iconBtn} text-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-50)] dark:text-[var(--brand-primary-400)] dark:hover:bg-gray-700`}
      >
        <Pencil className="h-4 w-4" />
      </Link>
      {canDelete && (
        <button
          type="button"
          onClick={handleDelete}
          aria-label={`Delete ${name}`}
          title="Delete"
          className={`${iconBtn} text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20`}
          disabled={deleteProduct.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
