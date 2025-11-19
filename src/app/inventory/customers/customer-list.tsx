"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Plus, Pencil, Trash2, Search, X, History } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Customer = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    loyaltyPoints: number | null;
};

export function CustomerList() {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState({ name: "", email: "", phone: "" });

    const { data: customers = [], refetch } = api.crm.listCustomers.useQuery({ search });

    const createMutation = api.crm.createCustomer.useMutation({
        onSuccess: () => {
            void refetch();
            closeModal();
        },
    });

    const updateMutation = api.crm.updateCustomer.useMutation({
        onSuccess: () => {
            void refetch();
            closeModal();
        },
    });

    const deleteMutation = api.crm.deleteCustomer.useMutation({
        onSuccess: () => {
            void refetch();
        },
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

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this customer?")) {
            deleteMutation.mutate({ id });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Customers
                </h1>
                <button
                    onClick={openCreateModal}
                    className="flex items-center justify-center gap-2 rounded-md bg-[var(--brand-primary-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-primary-hover)]"
                >
                    <Plus className="h-4 w-4" />
                    Add Customer
                </button>
            </div>

            <div className="flex items-center gap-4 rounded-lg border bg-white p-4 dark:bg-gray-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search customers..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-[var(--brand-primary-500)] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
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
                                        {customer.email || "-"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {customer.phone || "-"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {customer.loyaltyPoints ?? 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <Link
                                                href={`/inventory/customers/${customer.id}`}
                                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                title="View Purchase History"
                                            >
                                                <History className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => openEditModal(customer)}
                                                className="text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-900)] dark:text-[var(--brand-primary-400)] dark:hover:text-[var(--brand-primary-300)]"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(customer.id)}
                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
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
                                {editingCustomer ? "Edit Customer" : "New Customer"}
                            </h2>
                            <button onClick={closeModal} className="rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={closeModal} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
                                    Cancel
                                </button>
                                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="rounded-md bg-[var(--brand-primary-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-50">
                                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

