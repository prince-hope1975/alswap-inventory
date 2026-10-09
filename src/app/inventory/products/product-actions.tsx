"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

import { api } from "~/trpc/react";
import { toast } from "~/lib/toast";
import { useConfirm } from "~/components/ui/confirm-dialog";
import { iconBtn } from "~/components/ui/styles";
import { AdjustStockButton } from "./adjust-stock";

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
  const confirm = useConfirm();
  const utils = api.useUtils();
  const deleteProduct = api.inventory.deleteProduct.useMutation({
    onSuccess: () => {
      toast.success(`Deleted ${name}`);
      void utils.inventory.getLowStockProducts.invalidate();
      router.refresh();
    },
    onError: (e) => toast.error(`Could not delete product: ${e.message}`),
  });

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Delete ${name}?`,
      message: "This removes the product from your catalog and shop. It cannot be undone.",
      confirmLabel: "Delete product",
      destructive: true,
    });
    if (ok) deleteProduct.mutate({ id });
  };

  return (
    <div className="relative z-10 flex justify-end gap-1">
      <AdjustStockButton productId={id} productName={name} stockQuantity={stockQuantity} />
      <Link
        href={`/inventory/products/${id}`}
        aria-label={`Edit ${name}`}
        className={`${iconBtn} text-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-50)] dark:text-[var(--brand-primary-400)] dark:hover:bg-gray-700`}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </Link>
      {canDelete && (
        <button
          type="button"
          onClick={() => void handleDelete()}
          aria-label={`Delete ${name}`}
          className={`${iconBtn} text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20`}
          disabled={deleteProduct.isPending}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
