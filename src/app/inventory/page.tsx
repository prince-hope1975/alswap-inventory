"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { StatsGrid } from "./stats-grid";
import { RecentSales } from "./recent-sales";
import { TopSelling } from "./top-selling";
import { Plus } from "lucide-react";

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

            <StatsGrid 
                stats={stats ?? {
                    totalProducts: 0,
                    lowStock: 0,
                    totalValue: 0,
                    salesToday: 0
                }} 
                isLoading={isLoading} 
            />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <RecentSales sales={stats?.recentActivity ?? []} isLoading={isLoading} />
                <TopSelling products={stats?.topSelling ?? []} isLoading={isLoading} />
            </div>
        </div>
    );
}
