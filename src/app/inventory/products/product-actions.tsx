"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Pencil, Trash2 } from "lucide-react";

export function ProductActions({ id }: { id: string }) {
    const router = useRouter();
    const deleteProduct = api.inventory.deleteProduct.useMutation({
        onSuccess: () => {
            router.refresh();
        },
    });

    const handleDelete = () => {
        if (confirm("Are you sure you want to delete this product?")) {
            deleteProduct.mutate({ id });
        }
    };

    return (
        <div className="flex justify-end gap-2">
            <Link
                href={`/inventory/products/${id}`}
                className="text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-900)] dark:text-[var(--brand-primary-400)] dark:hover:text-[var(--brand-primary-300)]"
            >
                <Pencil className="h-4 w-4" />
            </Link>
            <button
                onClick={handleDelete}
                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                disabled={deleteProduct.isPending}
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}

