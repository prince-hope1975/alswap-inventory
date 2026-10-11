"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, FileDown, Receipt, Search, User } from "lucide-react";

import { api } from "~/trpc/react";
import { exportToPDF, exportToExcel } from "~/lib/export-utils";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { countsAsSale, isAwaitingOnlinePayment, orderStatusLabel } from "~/lib/domain/order-status";
import { paymentLabel } from "~/lib/domain/order-labels";
import { LoadError } from "~/components/ui/load-error";
import { Skeleton } from "~/components/ui/skeleton";
import { btnSecondary, iconBtn, inputCls } from "~/components/ui/styles";

const PAGE_SIZE = 25;
const th = "px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400";

export default function SalesHistoryPage() {
    const [searchText, setSearchText] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const { formatCurrency } = useCurrency();

    // Debounce typing; a new search starts at page 1.
    useEffect(() => {
        const t = setTimeout(() => {
            setSearch(searchText.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(t);
    }, [searchText]);

    const { data, isLoading, isFetching, error, refetch, isRefetching } = api.orders.salesHistory.useQuery(
        { search: search || undefined, page, pageSize: PAGE_SIZE },
        { placeholderData: (prev) => prev },
    );

    const orders = data?.items ?? [];
    const total = data?.total ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const firstShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const lastShown = Math.min(total, page * PAGE_SIZE);

    const exportRows = (money: (n: number) => string | number) =>
        orders.map((order) => ({
            "Order ID": order.id.slice(0, 8),
            Customer: order.customer?.name ?? order.customerName ?? "Guest",
            Items: order.itemCount,
            "Payment Method": paymentLabel(order.paymentMethod),
            Status: orderStatusLabel(order),
            Date: new Date(order.createdAt).toLocaleDateString(),
            Total: money(Number(order.totalAmount)),
        }));
    const exportCols = ["Order ID", "Customer", "Items", "Payment Method", "Status", "Date", "Total"];

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Sales History</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Every order, newest first. Cancelled orders and unpaid online checkouts are listed but not
                        counted in revenue.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Revenue{search ? " (matching search)" : ""}
                        </p>
                        {data ? (
                            <p className="text-xl font-bold text-gray-900 tabular-nums dark:text-white">
                                {formatCurrency(data.revenue)}
                            </p>
                        ) : (
                            <Skeleton className="mt-1 h-7 w-28" />
                        )}
                        {data && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                from {data.saleCount.toLocaleString()} sale{data.saleCount === 1 ? "" : "s"}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={orders.length === 0}
                            onClick={() =>
                                exportToPDF("Sales History", exportRows((n) => formatCurrency(n.toFixed(2))), exportCols)
                            }
                            className={btnSecondary}
                            title="Exports the orders on this page"
                        >
                            <Download className="h-4 w-4" aria-hidden="true" />
                            PDF<span className="sr-only"> of this page</span>
                        </button>
                        <button
                            type="button"
                            disabled={orders.length === 0}
                            onClick={() => exportToExcel("Sales History", exportRows((n) => n), exportCols)}
                            className={btnSecondary}
                            title="Exports the orders on this page"
                        >
                            <FileDown className="h-4 w-4" aria-hidden="true" />
                            Excel<span className="sr-only"> of this page</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="relative">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                    <input
                        type="search"
                        aria-label="Search sales"
                        placeholder="Search by order #, customer name, email or phone…"
                        value={searchText}
                        maxLength={100}
                        onChange={(e) => setSearchText(e.target.value)}
                        className={`${inputCls} pl-10`}
                    />
                    {isFetching && !isLoading && (
                        <div className="absolute top-1/2 right-3 -translate-y-1/2" aria-hidden="true">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--brand-primary-600)] border-t-transparent" />
                        </div>
                    )}
                </div>
            </div>

            {error ? (
                <LoadError
                    title="Couldn't load sales."
                    message={error.message}
                    onRetry={() => void refetch()}
                    retrying={isRefetching}
                />
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className={th}>Order</th>
                                <th className={th}>Customer</th>
                                <th className={th}>Items</th>
                                <th className={th}>Payment</th>
                                <th className={th}>Date</th>
                                <th className={`${th} text-right`}>Total</th>
                                <th className={`${th} text-right`}>
                                    <span className="sr-only">Receipt</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                Array.from({ length: 6 }, (_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 7 }, (_, j) => (
                                            <td key={j} className="px-4 py-4">
                                                <Skeleton className="h-4 w-full max-w-24" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                                        {search ? "No orders match your search." : "No sales yet. Completed POS and shop orders appear here."}
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => {
                                    const customerName = order.customer?.name ?? order.customerName;
                                    const customerEmail = order.customer?.email ?? order.customerEmail;
                                    return (
                                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                                                    #{order.id.slice(0, 8)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                {customerName ? (
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{customerName}</div>
                                                            {customerEmail && (
                                                                <div className="text-xs text-gray-500 dark:text-gray-400">{customerEmail}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">Guest</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                                            </td>
                                            <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                                                {paymentLabel(order.paymentMethod)}
                                                {!countsAsSale(order) && (
                                                    <span
                                                        className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${isAwaitingOnlinePayment(order) ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}
                                                    >
                                                        {orderStatusLabel(order)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                                                {new Date(order.createdAt).toLocaleDateString()}
                                                <br />
                                                <span className="text-xs">{new Date(order.createdAt).toLocaleTimeString()}</span>
                                            </td>
                                            <td
                                                className={`px-4 py-4 text-right text-sm font-semibold whitespace-nowrap tabular-nums ${countsAsSale(order) ? "text-gray-900 dark:text-white" : "text-gray-400 line-through dark:text-gray-500"}`}
                                            >
                                                {formatCurrency(Number(order.totalAmount))}
                                            </td>
                                            <td className="px-4 py-4 text-right whitespace-nowrap">
                                                <Link
                                                    href={`/pos/receipt/${order.id}`}
                                                    aria-label={`View receipt for order #${order.id.slice(0, 8)}`}
                                                    className={`${iconBtn} text-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-50)] dark:text-[var(--brand-primary-400)] dark:hover:bg-gray-700`}
                                                >
                                                    <Receipt className="h-4 w-4" aria-hidden="true" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {total > 0 && !error && (
                <nav
                    aria-label="Pagination"
                    className="flex flex-col items-center justify-between gap-3 text-sm text-gray-600 sm:flex-row dark:text-gray-300"
                >
                    <p>
                        Showing {firstShown}–{lastShown} of {total.toLocaleString()}
                    </p>
                    {pageCount > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className={btnSecondary}
                            >
                                <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
                            </button>
                            <span className="px-2 tabular-nums">
                                Page {page} of {pageCount}
                            </span>
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                                disabled={page >= pageCount}
                                className={btnSecondary}
                            >
                                Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>
                    )}
                </nav>
            )}
        </div>
    );
}
