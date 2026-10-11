"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "~/lib/toast";
import { Dialog, DialogFooter } from "~/components/ui/dialog";
import { useConfirm } from "~/components/ui/confirm-dialog";
import { btnPrimary, btnSecondary, hintCls, iconBtn, inputCls, labelCls } from "~/components/ui/styles";

type Category = {
  id: number;
  name: string;
  tenantId: string;
  slug: string | null;
  description: string | null;
};

export function CategoryList({
  initialCategories,
  canDelete,
}: {
  initialCategories: Category[];
  /** Hard deletes stay ADMIN-only (the router enforces it too). */
  canDelete: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const fieldId = useId();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const createMutation = api.inventory.createCategory.useMutation({
    onSuccess: (_data, vars) => {
      toast.success(`Created ${vars.name}`);
      router.refresh();
      closeModal();
    },
    onError: (e) => toast.error(`Could not create category: ${e.message}`),
  });

  const updateMutation = api.inventory.updateCategory.useMutation({
    onSuccess: () => {
      toast.success("Category updated");
      router.refresh();
      closeModal();
    },
    onError: (e) => toast.error(`Could not update category: ${e.message}`),
  });

  const deleteMutation = api.inventory.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success("Category deleted");
      router.refresh();
    },
    onError: (e) => toast.error(`Could not delete category: ${e.message}`),
  });

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description ?? "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        name: formData.name,
        description: formData.description,
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        description: formData.description,
      });
    }
  };

  const handleDelete = async (category: Category) => {
    const ok = await confirm({
      title: `Delete the ${category.name} category?`,
      message: "Products are not deleted. A category that is still a product's main category cannot be removed. This cannot be undone.",
      confirmLabel: "Delete category",
      destructive: true,
    });
    if (ok) deleteMutation.mutate({ id: category.id });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Categories
        </h1>
        <button type="button" onClick={openCreateModal} className={btnPrimary}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Category
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                Name
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {initialCategories.length === 0 ? (
              <tr>
                <td
                  colSpan={2}
                  className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                >
                  No categories found. Add your first category.
                </td>
              </tr>
            ) : (
              initialCategories.map((category) => (
                <tr
                  key={category.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    <span className="block">{category.name}</span>
                    {category.description && (
                      <span className="mt-1 block max-w-2xl text-xs font-normal text-gray-500 dark:text-gray-400">
                        {category.description}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(category)}
                        aria-label={`Edit ${category.name}`}
                        className={`${iconBtn} text-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-50)] dark:text-[var(--brand-primary-400)] dark:hover:bg-gray-700`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(category)}
                          disabled={deleteMutation.isPending}
                          aria-label={`Delete ${category.name}`}
                          className={`${iconBtn} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={isModalOpen}
        onClose={closeModal}
        title={editingCategory ? "Edit category" : "New category"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={`${fieldId}-name`} className={labelCls}>
              Name
            </label>
            <input
              id={`${fieldId}-name`}
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`mt-1 ${inputCls}`}
            />
          </div>

          <div>
            <label htmlFor={`${fieldId}-description`} className={labelCls}>
              Public description
            </label>
            <textarea
              id={`${fieldId}-description`}
              rows={4}
              maxLength={2000}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              aria-describedby={`${fieldId}-description-hint`}
              placeholder="Explain what shoppers will find in this category and what the products are used for."
              className={`mt-1 ${inputCls} leading-6`}
            />
            <p id={`${fieldId}-description-hint`} className={hintCls}>
              Shown on the crawlable category page.
            </p>
          </div>

          <DialogFooter>
            <button type="button" onClick={closeModal} className={btnSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className={btnPrimary}>
              {isSubmitting ? "Saving…" : "Save"}
            </button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
