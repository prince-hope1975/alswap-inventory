"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { StatsGrid } from "./stats-grid";
import { RecentSales } from "./recent-sales";
import { TopSelling } from "./top-selling";
import { Plus } from "lucide-react";
import { ErrorBoundary } from "~/components/error-boundary";
import { ComponentErrorFallback } from "~/components/route-error-boundary";

export default function InventoryDashboard() {
    const { data: stats, isLoading } = api.inventory.getDashboardStats.useQuery(undefined, {
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
                        Welcome back! Here&apos;s your inventory overview
                    </p>
                </div>
                <Link
                    href="/inventory/products/new"
                    className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                >
                    <Plus className="h-4 w-4" />
                    Add Product
                </Link>
            </div>

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
