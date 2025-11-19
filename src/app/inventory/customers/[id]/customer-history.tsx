"use client";

import { Receipt, Calendar, DollarSign, Download, FileDown } from "lucide-react";
import Link from "next/link";
import { exportToPDF, exportToExcel } from "~/lib/export-utils";

interface CustomerHistoryProps {
    customer: {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        loyaltyPoints: number | null;
        orders: Array<{
            id: string;
            totalAmount: string;
            createdAt: Date;
            items: Array<{
                quantity: number;
                price: string;
                product: {
                    name: string;
                };
            }>;
        }>;
    };
}

export function CustomerHistory({ customer }: CustomerHistoryProps) {
    const totalSpent = customer.orders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0
    );

    return (
        <div className="space-y-6">
            {/* Customer Summary Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="grid gap-6 md:grid-cols-3">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                            {customer.orders.length}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                            ${totalSpent.toFixed(2)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loyalty Points</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                            {customer.loyaltyPoints ?? 0}
                        </p>
                    </div>
                </div>
            </div>

            {/* Orders List */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Recent Orders
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                exportToPDF(
                                    `Purchase History - ${customer.name}`,
                                    customer.orders.map((order) => ({
                                        "Order ID": order.id.slice(0, 8),
                                        Date: new Date(order.createdAt).toLocaleDateString(),
                                        Items: order.items.length,
                                        Total: `$${Number(order.totalAmount).toFixed(2)}`,
                                    })),
                                    ["Order ID", "Date", "Items", "Total"]
                                );
                            }}
                            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            <Download className="h-4 w-4" />
                            PDF
                        </button>
                        <button
                            onClick={() => {
                                exportToExcel(
                                    `Purchase History - ${customer.name}`,
                                    customer.orders.map((order) => ({
                                        "Order ID": order.id.slice(0, 8),
                                        Date: new Date(order.createdAt).toLocaleDateString(),
                                        Items: order.items.length,
                                        Total: Number(order.totalAmount),
                                    })),
                                    ["Order ID", "Date", "Items", "Total"]
                                );
                            }}
                            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            <FileDown className="h-4 w-4" />
                            Excel
                        </button>
                    </div>
                </div>
                {customer.orders.length === 0 ? (
                    <div className="p-12 text-center">
                        <Receipt className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-4 text-gray-500 dark:text-gray-400">
                            No purchase history yet
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {customer.orders.map((order) => (
                            <Link
                                key={order.id}
                                href={`/pos/receipt/${order.id}`}
                                className="block p-6 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <Receipt className="h-5 w-5 text-[var(--brand-primary-600)] dark:text-[var(--brand-primary-400)]" />
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    Order #{order.id.slice(0, 8)}
                                                </p>
                                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                    {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {order.items.slice(0, 3).map((item, idx) => (
                                                <span
                                                    key={idx}
                                                    className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                                >
                                                    {item.product.name} x{item.quantity}
                                                </span>
                                            ))}
                                            {order.items.length > 3 && (
                                                <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                                    +{order.items.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="ml-4 text-right">
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                            ${Number(order.totalAmount).toFixed(2)}
                                        </p>
                                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

