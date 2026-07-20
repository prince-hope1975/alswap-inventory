"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Plus, Pencil, Trash2, Search, X, Shield, UserCheck, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";

type User = {
    id: string;
    name: string | null;
    email: string;
    role: "ADMIN" | "MANAGER" | "CASHIER";
};

const roleLabels = {
    ADMIN: "Admin",
    MANAGER: "Manager",
    CASHIER: "Cashier",
};

const roleIcons = {
    ADMIN: Shield,
    MANAGER: UserCog,
    CASHIER: UserCheck,
};

export default function UserManagementPage() {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "CASHIER" as "ADMIN" | "MANAGER" | "CASHIER",
    });

    const { data: users = [], refetch } = api.users.listUsers.useQuery();
    const currentUser = api.users.listUsers.useQuery(); // We'll get current user from session

    const createMutation = api.users.createUser.useMutation({
        onSuccess: () => {
            void refetch();
            closeModal();
        },
    });

    const updateMutation = api.users.updateUser.useMutation({
        onSuccess: () => {
            void refetch();
            closeModal();
        },
    });

    const deleteMutation = api.users.deleteUser.useMutation({
        onSuccess: () => {
            void refetch();
        },
    });

    const filteredUsers = users.filter((user) => {
        if (!search) return true;
        const query = search.toLowerCase();
        return (
            user.name?.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            (user.role ?? "CASHIER").toLowerCase().includes(query)
        );
    });

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({ name: "", email: "", password: "", role: "CASHIER" });
        setIsModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setFormData({
            name: user.name ?? "",
            email: user.email,
            password: "", // Don't pre-fill password
            role: user.role,
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setFormData({ name: "", email: "", password: "", role: "CASHIER" });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            updateMutation.mutate({
                id: editingUser.id,
                name: formData.name || undefined,
                email: formData.email,
                role: formData.role,
                password: formData.password || undefined, // Only update if provided
            });
        } else {
            if (!formData.password) {
                alert("Password is required for new users");
                return;
            }
            createMutation.mutate({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role,
            });
        }
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            deleteMutation.mutate({ id });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        User Management
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Manage team members and their access levels
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center justify-center gap-2 rounded-md bg-[var(--brand-primary-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-primary-hover)]"
                >
                    <Plus className="h-4 w-4" />
                    Invite User
                </button>
            </div>

            <div className="flex items-center gap-4 rounded-lg border bg-white p-4 dark:bg-gray-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
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
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Role
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                                    {search ? "No users found matching your search." : "No users found."}
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => {
                                const normalizedRole = user.role === "ADMIN" || user.role === "MANAGER" || user.role === "CASHIER" ? user.role : "CASHIER";
                                const RoleIcon = roleIcons[normalizedRole];
                                return (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {user.name ?? "N/A"}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {user.email}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium">
                                                <RoleIcon className="h-3 w-3" />
                                                {roleLabels[normalizedRole]}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal({ ...user, role: normalizedRole })}
                                                    className="text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-900)] dark:text-[var(--brand-primary-400)] dark:hover:text-[var(--brand-primary-300)]"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
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
                                {editingUser ? "Edit User" : "Invite New User"}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {editingUser ? "New Password (leave blank to keep current)" : "Password"}
                                </label>
                                <input
                                    type="password"
                                    required={!editingUser}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Role
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) =>
                                        setFormData({ ...formData, role: e.target.value as "ADMIN" | "MANAGER" | "CASHIER" })
                                    }
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="CASHIER">Cashier</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="rounded-md bg-[var(--brand-primary-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
                                >
                                    {createMutation.isPending || updateMutation.isPending
                                        ? "Saving..."
                                        : editingUser
                                          ? "Update User"
                                          : "Create User"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
