"use client";

import { cn } from "~/lib/utils";
import { useId, useState } from "react";
import { Plus, Loader2 } from "lucide-react";

import { api } from "~/trpc/react";
import { Dialog, DialogFooter } from "~/components/ui/dialog";
import { btnPrimary, btnSecondary, errorTextCls, inputCls, labelCls } from "~/components/ui/styles";

interface CreateCategoryDialogProps {
    onCategoryCreated: (category: { id: number; name: string }) => void;
}

export function CreateCategoryDialog({ onCategoryCreated }: CreateCategoryDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const inputId = useId();

    const createCategory = api.inventory.createCategory.useMutation({
        onSuccess: (data) => {
            close();
            const created = Array.isArray(data) ? data[0] : undefined;
            if (created) onCategoryCreated(created);
        },
        onError: (e) => setError(e.message || "Failed to create category"),
    });

    function close() {
        setIsOpen(false);
        setName("");
        setError("");
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        createCategory.mutate({ name: name.trim() });
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                aria-label="Create new category"
                className={cn(btnSecondary, "h-[38px] flex-none px-3")}
            >
                <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
            <Dialog open={isOpen} onClose={close} title="Add new category" className="max-w-sm">
                <form onSubmit={submit}>
                    <label htmlFor={inputId} className={labelCls}>
                        Category name
                    </label>
                    <input
                        id={inputId}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`mt-1 ${inputCls}`}
                        placeholder="e.g. Electronics"
                        aria-invalid={!!error}
                        aria-describedby={error ? `${inputId}-error` : undefined}
                        required
                    />
                    {error && (
                        <p id={`${inputId}-error`} role="alert" className={errorTextCls}>
                            {error}
                        </p>
                    )}
                    <DialogFooter>
                        <button type="button" onClick={close} className={btnSecondary}>
                            Cancel
                        </button>
                        <button type="submit" disabled={createCategory.isPending || !name.trim()} className={btnPrimary}>
                            {createCategory.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            Create
                        </button>
                    </DialogFooter>
                </form>
            </Dialog>
        </>
    );
}
