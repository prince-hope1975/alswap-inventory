"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "~/lib/toast";

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

  const handleDelete = (category: Category) => {
    if (confirm(`Delete the "${category.name}" category? This cannot be undone.`)) {
      deleteMutation.mutate({ id: category.id });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Categories
        </h1>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-md bg-[var(--brand-primary-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-primary-hover)]"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
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
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-900)] dark:text-[var(--brand-primary-400)] dark:hover:text-[var(--brand-primary-300)]"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(category)}
                          disabled={deleteMutation.isPending}
                          aria-label={`Delete ${category.name}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:text-red-900 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingCategory ? "Edit Category" : "New Category"}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--brand-primary-500)] focus:ring-[var(--brand-primary-focus)] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Public description
                </label>
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Explain what shoppers will find in this category and what the products are used for."
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm leading-6 shadow-sm focus:border-[var(--brand-primary-500)] focus:ring-[var(--brand-primary-focus)] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Shown on the crawlable category page.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-[var(--brand-primary-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
