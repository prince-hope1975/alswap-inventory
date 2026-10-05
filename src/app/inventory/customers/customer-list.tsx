"use client";

import { useId, useState } from "react";
import { api } from "~/trpc/react";
import { Plus, Pencil, Trash2, Search, History } from "lucide-react";
import Link from "next/link";
import { toast } from "~/lib/toast";
import { Dialog, DialogFooter } from "~/components/ui/dialog";
import { useConfirm } from "~/components/ui/confirm-dialog";
import { btnPrimary, btnSecondary, iconBtn, inputCls, labelCls } from "~/components/ui/styles";

type Customer = {
    id: string;
    tenantId: string;
    createdAt: Date;
    name: string;
    email: string | null;
    phone: string | null;
    loyaltyPoints: number | null;
};

export function CustomerList({
    initialCustomers = [],
    canDelete = false,
}: {
    initialCustomers?: Customer[];
    /** Deleting customers stays ADMIN-only (enforced by the crm router too). */
    canDelete?: boolean;
}) {
    const confirm = useConfirm();
    const fieldId = useId();
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState({ name: "", email: "", phone: "" });

    const { data: customers = [], refetch } = api.crm.listCustomers.useQuery(
        { search },
        { initialData: search ? undefined : initialCustomers },
    );

    const createMutation = api.crm.createCustomer.useMutation({
        onSuccess: () => {
            toast.success("Customer added");
            void refetch();
            closeModal();
        },
        onError: (e) => toast.error(`Could not add customer: ${e.message}`),
    });

    const updateMutation = api.crm.updateCustomer.useMutation({
        onSuccess: () => {
            toast.success("Customer updated");
            void refetch();
            closeModal();
        },
        onError: (e) => toast.error(`Could not update customer: ${e.message}`),
    });

    const deleteMutation = api.crm.deleteCustomer.useMutation({
        onSuccess: () => {
            toast.success("Customer deleted");
            void refetch();
        },
        onError: (e) => toast.error(`Could not delete customer: ${e.message}`),
    });

    const openCreateModal = () => {
        setEditingCustomer(null);
        setFormData({ name: "", email: "", phone: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (customer: Customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name,
            email: customer.email ?? "",
            phone: customer.phone ?? "",
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCustomer(null);
        setFormData({ name: "", email: "", phone: "" });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCustomer) {
            updateMutation.mutate({
                id: editingCustomer.id,
                name: formData.name,
                email: formData.email || undefined,
                phone: formData.phone || undefined,
            });
        } else {
            createMutation.mutate({
                name: formData.name,
                email: formData.email || undefined,
                phone: formData.phone || undefined,
            });
        }
    };

    const handleDelete = async (customer: Customer) => {
        const ok = await confirm({
            title: `Delete ${customer.name}?`,
            message: "Their contact details and loyalty points are removed. This cannot be undone.",
            confirmLabel: "Delete customer",
            destructive: true,
        });
        if (ok) deleteMutation.mutate({ id: customer.id });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Customers
                </h1>
                <button type="button" onClick={openCreateModal} className={btnPrimary}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add Customer
                </button>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                    <input
                        type="search"
                        aria-label="Search customers"
                        placeholder="Search by name, email or phone…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={`${inputCls} pl-10`}
                    />
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Phone</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Loyalty Points</th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                        {customers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                                    No customers found.
                                </td>
                            </tr>
                        ) : (
                            customers.map((customer) => (
                                <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-medium text-gray-900 dark:text-white">{customer.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {customer.email?.trim() ? customer.email : "-"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {customer.phone?.trim() ? customer.phone : "-"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {customer.loyaltyPoints ?? 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-1">
                                            <Link
                                                href={`/inventory/customers/${customer.id}`}
                                                aria-label={`Purchase history for ${customer.name}`}
                                                className={`${iconBtn} text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700`}
                                            >
                                                <History className="h-4 w-4" aria-hidden="true" />
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(customer)}
                                                aria-label={`Edit ${customer.name}`}
                                                className={`${iconBtn} text-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-50)] dark:text-[var(--brand-primary-400)] dark:hover:bg-gray-700`}
                                            >
                                                <Pencil className="h-4 w-4" aria-hidden="true" />
                                            </button>
                                            {canDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDelete(customer)}
                                                    aria-label={`Delete ${customer.name}`}
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

            <Dialog open={isModalOpen} onClose={closeModal} title={editingCustomer ? "Edit customer" : "New customer"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor={`${fieldId}-name`} className={labelCls}>Name</label>
                        <input
                            id={`${fieldId}-name`}
                            type="text"
                            required
                            autoComplete="off"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={`mt-1 ${inputCls}`}
                        />
                    </div>
                    <div>
                        <label htmlFor={`${fieldId}-email`} className={labelCls}>Email</label>
                        <input
                            id={`${fieldId}-email`}
                            type="email"
                            autoComplete="off"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className={`mt-1 ${inputCls}`}
                        />
                    </div>
                    <div>
                        <label htmlFor={`${fieldId}-phone`} className={labelCls}>Phone</label>
                        <input
                            id={`${fieldId}-phone`}
                            type="tel"
                            autoComplete="off"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className={`mt-1 ${inputCls}`}
                        />
                    </div>
                    <DialogFooter>
                        <button type="button" onClick={closeModal} className={btnSecondary}>
                            Cancel
                        </button>
                        <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className={btnPrimary}>
                            {createMutation.isPending || updateMutation.isPending ? "Saving…" : "Save"}
                        </button>
                    </DialogFooter>
                </form>
            </Dialog>
        </div>
    );
}
