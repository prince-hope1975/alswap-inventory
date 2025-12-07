"use client";

import { api } from "~/trpc/react";
import { Receipt, Calendar, DollarSign, User, Search, Download, FileDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { exportToPDF, exportToExcel } from "~/lib/export-utils";
import { useCurrency } from "~/hooks/use-tenant-settings";

export default function SalesHistoryPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const { data: orders, isLoading } = api.pos.listOrders.useQuery({ limit: 100 });
    const { formatCurrency } = useCurrency();
    const filteredOrders = orders?.filter((order) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            order.id.toLowerCase().includes(query) ||
            order.customer?.name.toLowerCase().includes(query) ||
            order.customer?.email?.toLowerCase().includes(query)
        );
    });

    const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.totalAmount), 0) ?? 0;

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Sales History
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        View all completed transactions
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="rounded-lg border bg-white p-3 dark:bg-gray-800">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(totalRevenue.toFixed(2))}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                if (filteredOrders) {
                                    exportToPDF(
                                        "Sales History",
                                        filteredOrders.map((order) => ({
                                            "Order ID": order.id.slice(0, 8),
                                            Customer: order.customer?.name ?? "Guest",
                                            Items: order.items.length,
                                            "Payment Method": order.paymentMethod,
                                            Date: new Date(order.createdAt).toLocaleDateString(),
                                            Total: `${formatCurrency(Number(order.totalAmount).toFixed(2))}`,
                                        })),
                                        ["Order ID", "Customer", "Items", "Payment Method", "Date", "Total"]
                                    );
                                }
                            }}
                            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            <Download className="h-4 w-4" />
                            PDF
                        </button>
                        <button
                            onClick={() => {
                                if (filteredOrders) {
                                    exportToExcel(
                                        "Sales History",
                                        filteredOrders.map((order) => ({
                                            "Order ID": order.id.slice(0, 8),
                                            Customer: order.customer?.name ?? "Guest",
                                            Items: order.items.length,
                                            "Payment Method": order.paymentMethod,
                                            Date: new Date(order.createdAt).toLocaleDateString(),
                                            Total: Number(order.totalAmount),
                                        })),
                                        ["Order ID", "Customer", "Items", "Payment Method", "Date", "Total"]
                                    );
                                }
                            }}
                            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            <FileDown className="h-4 w-4" />
                            Excel
                        </button>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 rounded-lg border bg-white p-4 dark:bg-gray-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by order ID, customer name, or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-purple-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-hidden rounded-lg border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Order ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Customer
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Items
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Payment
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Date
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Total
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                        {!filteredOrders || filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                                    {searchQuery ? "No orders found matching your search." : "No sales history yet."}
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <div className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                                            #{order.id.slice(0, 8)}
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        {order.customer ? (
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-gray-400" />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {order.customer.name}
                                                    </div>
                                                    {order.customer.email && (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            {order.customer.email}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Guest</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                        {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                        {order.paymentMethod}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                        <br />
                                        <span className="text-xs">
                                            {new Date(order.createdAt).toLocaleTimeString()}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(Number(order.totalAmount))}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                        <Link
                                            href={`/pos/receipt/${order.id}`}
                                            className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                                        >
                                            <Receipt className="h-4 w-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

