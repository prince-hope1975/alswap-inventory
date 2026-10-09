"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { StatsGrid } from "./stats-grid";
import { RecentSales } from "./recent-sales";
import { TopSelling } from "./top-selling";
import { AlertTriangle, Plus, RefreshCw } from "lucide-react";
import { ErrorBoundary } from "~/components/error-boundary";
import { ComponentErrorFallback } from "~/components/route-error-boundary";
import { btnPrimary } from "~/components/ui/styles";

export default function InventoryDashboard() {
    const { data: stats, isLoading, error, refetch, isRefetching } = api.inventory.getDashboardStats.useQuery(undefined, {
        refetchInterval: 1000 * 60, // Refresh every minute
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Dashboard
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Your inventory and sales at a glance
                    </p>
                </div>
                <Link
                    href="/inventory/products/new"
                    className={btnPrimary}
                >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add Product
                </Link>
            </div>

            {error && (
                <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <p>
                            <span className="font-semibold">Couldn&apos;t load the dashboard.</span>{" "}
                            {error.data?.code === "FORBIDDEN"
                                ? "Your account doesn't have access to inventory data."
                                : "Check your connection and try again."}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void refetch()}
                        disabled={isRefetching}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-gray-900 dark:text-red-300"
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} aria-hidden="true" />
                        Retry
                    </button>
                </div>
            )}

            <ErrorBoundary
                componentName="StatsGrid"
                fallback={<ComponentErrorFallback title="Stats Error" message="Failed to load dashboard statistics" />}
            >
                <StatsGrid
                    stats={stats ?? {
                        totalProducts: 0,
                        productsWithUnknownQuantity: 0,
                        lowStock: 0,
                        totalValue: 0,
                        totalValueConfirmed: 0,
                        totalValueEstimated: 0,
                        salesToday: 0
                    }}
                    isLoading={isLoading}
                />
            </ErrorBoundary>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <ErrorBoundary
                    className="lg:col-span-4"
                    componentName="RecentSales"
                    fallback={<ComponentErrorFallback title="Sales Error" message="Failed to load recent sales history" />}
                >
                    <RecentSales sales={stats?.recentActivity ?? []} isLoading={isLoading} />
                </ErrorBoundary>

                <ErrorBoundary
                    className="lg:col-span-3"
                    componentName="TopSelling"
                    fallback={<ComponentErrorFallback title="Products Error" message="Failed to load top selling products" />}
                >
                    <TopSelling products={stats?.topSelling ?? []} isLoading={isLoading} />
                </ErrorBoundary>
            </div>
        </div>
    );
}
