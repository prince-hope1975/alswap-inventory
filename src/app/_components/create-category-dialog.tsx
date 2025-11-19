"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Plus, Loader2 } from "lucide-react";

interface CreateCategoryDialogProps {
    onCategoryCreated: (category: { id: number; name: string }) => void;
}

export function CreateCategoryDialog({ onCategoryCreated }: CreateCategoryDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    const [error, setError] = useState("");

    const utils = api.useUtils();

    const createCategory = api.inventory.createCategory.useMutation({
        onSuccess: async (data: any) => {
            setIsOpen(false);
            setName("");
            setError("");
            
            // Invalidate and refetch categories query
            utils.inventory.listCategories.invalidate();
            await utils.inventory.listCategories.refetch();
            
            // Call callback with the created category
            if (Array.isArray(data) && data[0]) {
                onCategoryCreated(data[0]);
            } else {
                // If data structure is unexpected, still refetch to refresh
                console.warn("Unexpected category creation response:", data);
            }
        },
        onError: (e) => {
            setError(e.message || "Failed to create category");
            console.error("Category creation error:", e);
        }
    });
    
    const handleSubmit = async () => {
        if (!name.trim()) return;

        try {
            await createCategory.mutateAsync({ name });
        } catch (err) {
            // Error is handled in onError
            console.error("Failed to create category:", err);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
        }
    };

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="inline-flex flex-none items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                title="Create new category"
            >
                <Plus className="h-4 w-4" />
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Category</h3>
                <div className="mt-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Category Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-[var(--brand-primary-focus)] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            placeholder="e.g. Electronics"
                            autoFocus
                        />
                        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                setName("");
                                setError("");
                            }}
                            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={createCategory.isPending || !name.trim()}
                            className="inline-flex items-center rounded-md bg-[var(--brand-primary-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
                        >
                            {createCategory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

