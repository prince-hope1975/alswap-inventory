"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Clock, CheckCircle, XCircle, LayoutDashboard, Package, Layers, Users, ShoppingCart, Settings, BarChart3, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCurrency } from "~/hooks/use-tenant-settings";
import Link from "next/link";
import { cn } from "~/lib/utils";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "~/components/theme-toggle";

export default function ShiftsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const [startCash, setStartCash] = useState("0");
    const [endCash, setEndCash] = useState("0");
    const [showCloseModal, setShowCloseModal] = useState(false);
    const { formatCurrency, currency } = useCurrency();

    const navItems = [
        { href: "/inventory", label: "Dashboard", icon: LayoutDashboard },
        { href: "/inventory/products", label: "Products", icon: Package },
        { href: "/inventory/categories", label: "Categories", icon: Layers },
        { href: "/inventory/customers", label: "Customers", icon: Users },
        { href: "/inventory/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/pos", label: "POS Terminal", icon: ShoppingCart },
        { href: "/pos/shifts", label: "Shifts", icon: Clock },
        { href: "/inventory/settings", label: "Settings", icon: Settings },
    ];

    const { data: currentShift, refetch } = api.pos.getCurrentShift.useQuery();
    const { data: shifts } = api.pos.listShifts.useQuery();

    const openShift = api.pos.openShift.useMutation({
        onSuccess: () => {
            void refetch();
            setStartCash("0");
        },
    });

    const closeShift = api.pos.closeShift.useMutation({
        onSuccess: () => {
            void refetch();
            setShowCloseModal(false);
            setEndCash("0");
        },
    });

    const handleOpenShift = () => {
        const amount = parseFloat(startCash);
        if (isNaN(amount) || amount < 0) {
            alert("Please enter a valid amount");
            return;
        }
        openShift.mutate({ startCash: amount });
    };

    const handleCloseShift = () => {
        if (!currentShift) return;
        const amount = parseFloat(endCash);
        if (isNaN(amount) || amount < 0) {
            alert("Please enter a valid amount");
            return;
        }
        closeShift.mutate({ shiftId: currentShift.id, endCash: amount });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 dark:from-gray-900 dark:to-gray-950">
            <div className="mx-auto max-w-6xl space-y-6">
                {/* Navigation Bar */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <nav className="flex flex-wrap items-center gap-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                                        isActive
                                            ? "bg-gradient-to-r from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)] text-white shadow-md"
                                            : "text-gray-700 hover:bg-gradient-to-r hover:from-[var(--brand-primary-50)] hover:to-[var(--brand-primary-100)] hover:text-[var(--brand-primary-700)] dark:text-gray-300 dark:hover:bg-gradient-to-r dark:hover:from-[var(--brand-primary-900)]/20 dark:hover:to-[var(--brand-primary-800)]/20 dark:hover:text-[var(--brand-primary-400)]"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    <span className="hidden sm:inline">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Shift Management
                    </h1>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button
                            onClick={() => router.push("/pos")}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                            Back to POS
                        </button>
                    </div>
                </div>

                {/* Current Shift */}
                {currentShift ? (
                    <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-lg dark:border-green-800 dark:from-green-900/20 dark:to-emerald-900/20">
                        <div className="mb-4 flex items-center gap-2">
                            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Active Shift
                            </h2>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Shift ID</p>
                                <p className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                                    #{currentShift.id.slice(0, 8)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Started</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {new Date(currentShift.startTime).toLocaleTimeString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Starting Cash</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {formatCurrency(currentShift.startCash)}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCloseModal(true)}
                            className="mt-4 rounded-lg bg-red-600 px-6 py-2 font-semibold text-white transition-all hover:bg-red-700"
                        >
                            Close Shift
                        </button>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
                            Open New Shift
                        </h2>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Starting Cash Amount
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 font-medium">
                                        {currency}
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={startCash}
                                        onChange={(e) => setStartCash(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-4 focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-focus)]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={handleOpenShift}
                                    disabled={openShift.isPending}
                                    className="rounded-lg bg-gradient-to-r from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)] px-6 py-2 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50"
                                >
                                    {openShift.isPending ? "Opening..." : "Open Shift"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Shift History */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
                        Shift History
                    </h2>
                    <div className="space-y-3">
                        {shifts?.map((shift) => (
                            <div
                                key={shift.id}
                                className={cn(
                                    "flex items-center justify-between rounded-lg border p-4 transition-all",
                                    shift.status === "OPEN"
                                        ? "border-green-200 bg-green-50 cursor-pointer hover:bg-green-100 hover:shadow-md dark:border-green-800 dark:bg-green-900/20 dark:hover:bg-green-900/30"
                                        : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/50"
                                )}
                                onClick={() => {
                                    if (shift.status === "OPEN") {
                                        router.push("/pos");
                                    }
                                }}
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    {shift.status === "OPEN" ? (
                                        <Clock className="h-5 w-5 text-green-600" />
                                    ) : (
                                        <XCircle className="h-5 w-5 text-gray-400" />
                                    )}
                                    <div>
                                        <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                                            #{shift.id.slice(0, 8)}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(shift.startTime).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 text-right">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Start</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(shift.startCash)}
                                        </p>
                                    </div>
                                    {shift.endCash && (
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">End</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(shift.endCash)}
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={cn(
                                                "rounded-full px-3 py-1 text-xs font-semibold",
                                                shift.status === "OPEN"
                                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                    : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                            )}
                                        >
                                            {shift.status}
                                        </span>
                                        {shift.status === "OPEN" && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push("/pos");
                                                }}
                                                className="flex items-center gap-1 rounded-lg bg-[var(--brand-primary-600)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--brand-primary-hover)]"
                                            >
                                                Go to POS
                                                <ArrowRight className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Close Shift Modal */}
            {showCloseModal && currentShift && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                        <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
                            Close Shift
                        </h3>
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Ending Cash Amount
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 font-medium">
                                    {currency}
                                </span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={endCash}
                                    onChange={(e) => setEndCash(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-4 focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-focus)]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCloseModal(false)}
                                className="flex-1 rounded-lg border border-gray-300 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCloseShift}
                                disabled={closeShift.isPending}
                                className="flex-1 rounded-lg bg-red-600 py-2 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                            >
                                {closeShift.isPending ? "Closing..." : "Close Shift"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
