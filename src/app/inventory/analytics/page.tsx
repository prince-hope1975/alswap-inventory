"use client";

import { api } from "~/trpc/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { DollarSign, ShoppingBag, CreditCard, TrendingUp, Download, FileDown } from "lucide-react";
import { exportToPDF, exportToExcel } from "~/lib/export-utils";
import { useCurrency } from "~/hooks/use-tenant-settings";
import type { LucideIcon } from "lucide-react";
import { LoadError } from "~/components/ui/load-error";
import { Skeleton, SkeletonCards } from "~/components/ui/skeleton";
import { btnSecondary } from "~/components/ui/styles";

function KpiCard({ title, value, icon: Icon, subtext }: { title: string; value: string; icon: LucideIcon; subtext?: string }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
                <div className="rounded-lg bg-[var(--brand-primary-50)] p-2 dark:bg-[var(--brand-primary-900)]/20">
                    <Icon className="h-5 w-5 text-[var(--brand-primary-600)] dark:text-[var(--brand-primary-400)]" aria-hidden="true" />
                </div>
            </div>
            <div className="mt-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
                {subtext && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtext}</p>}
            </div>
        </div>
    );
}

// Brand-led palette: SVG fill accepts CSS variables, so charts follow the tenant theme.
const COLORS = [
    "var(--brand-primary-600)",
    "var(--brand-primary-400)",
    "var(--brand-primary-800)",
    "var(--brand-primary-300)",
    "var(--brand-primary-200)",
];


export default function AnalyticsPage() {
    const kpiQuery = api.analytics.getKpiStats.useQuery();
    const salesQuery = api.analytics.getSalesByDate.useQuery({ days: 30 });
    const categoryQuery = api.analytics.getTopCategories.useQuery();
    const { data: kpi, isLoading: kpiLoading } = kpiQuery;
    const { data: salesData, isLoading: salesLoading } = salesQuery;
    const { data: categoryData, isLoading: categoryLoading } = categoryQuery;
    const loadError = kpiQuery.error ?? salesQuery.error ?? categoryQuery.error;
    const { formatCurrency } = useCurrency();
    // AI summary
    const { data: aiSummary, isLoading: aiLoading } = api.analytics.getAiSummary.useQuery();

    const header = (
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Analytics & Reports</h1>
            <p className="text-gray-500 dark:text-gray-400">Insights into your business performance.</p>
        </div>
    );

    if (loadError) {
        return (
            <div className="space-y-6">
                {header}
                <LoadError
                    title="Couldn't load analytics."
                    message={loadError.message}
                    retrying={kpiQuery.isRefetching || salesQuery.isRefetching || categoryQuery.isRefetching}
                    onRetry={() => {
                        void kpiQuery.refetch();
                        void salesQuery.refetch();
                        void categoryQuery.refetch();
                    }}
                />
            </div>
        );
    }

    if (kpiLoading || salesLoading || categoryLoading) {
        return (
            <div className="space-y-6">
                {header}
                <SkeletonCards count={4} label="Loading analytics" className="md:grid-cols-2 lg:grid-cols-4" />
                <div className="grid gap-6 lg:grid-cols-2">
                    <Skeleton className="h-[360px] rounded-xl" />
                    <Skeleton className="h-[360px] rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
            {header}

            <div className="flex gap-2">
                <button
                    onClick={() => {
                        if (salesData) {
                            exportToPDF(
                                "Sales Report",
                                salesData.map((s) => ({
                                    Date: s.date,
                                    Revenue: formatCurrency(s.amount),
                                    Orders: s.count,
                                })),
                                ["Date", "Revenue", "Orders"]
                            );
                        }
                    }}
                    type="button"
                    className={btnSecondary}
                >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Export PDF
                </button>
                <button
                    onClick={() => {
                        if (salesData) {
                            exportToExcel(
                                "Sales Report",
                                salesData.map((s) => ({
                                    Date: s.date,
                                    Revenue: Number(s.amount),
                                    Orders: s.count,
                                })),
                                ["Date", "Revenue", "Orders"]
                            );
                        }
                    }}
                    type="button"
                    className={btnSecondary}
                >
                    <FileDown className="h-4 w-4" aria-hidden="true" />
                    Export Excel
                </button>
            </div>
            </div>

            {/* KPI Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    title="Total Revenue"
                    value={formatCurrency(kpi?.totalRevenue)}
                    icon={DollarSign}
                    subtext="All time sales"
                />
                <KpiCard
                    title="Total Orders"
                    value={kpi?.totalOrders.toLocaleString() ?? "0"}
                    icon={ShoppingBag}
                    subtext="Completed transactions"
                />
                <KpiCard
                    title="Avg. Order Value"
                    value={formatCurrency(kpi?.averageOrderValue)}
                    icon={CreditCard}
                    subtext="Revenue per order"
                />
                <KpiCard
                    title="Gross Profit"
                    value={formatCurrency(kpi?.grossProfit)}
                    icon={TrendingUp}
                    subtext="Revenue - Cost"
                />
            </div>

            {/* AI Summary Card */}
            <div className="rounded-xl border border-[var(--brand-primary-200)] bg-gradient-to-br from-[var(--brand-primary-50)] to-white p-6 shadow-sm dark:border-[var(--brand-primary-900)]/30 dark:from-[var(--brand-primary-900)]/10 dark:to-gray-800">
                <div className="flex items-start gap-4">
                    <div className="rounded-full bg-[var(--brand-primary-100)] p-2 dark:bg-[var(--brand-primary-900)]/30">
                        <div className="h-6 w-6 text-2xl" aria-hidden="true">✨</div>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Business Insights</h3>
                        {aiLoading ? (
                            <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        ) : (
                            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                                {aiSummary ? aiSummary.text : "AI insights will appear here once enough data is collected. Start selling to generate trends!"}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Sales Trend */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">Sales Trend (Last 30 Days)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salesData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 12, fill: "#6B7280" }}
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={30}
                                />
                                <YAxis
                                    tick={{ fontSize: 12, fill: "#6B7280" }}
                                    tickFormatter={(value: number) => formatCurrency(value)}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                                <Bar dataKey="amount" name="Revenue" fill="var(--brand-primary-600)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Categories */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">Top Categories by Revenue</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData?.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

