"use client";

import { api } from "~/trpc/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { DollarSign, ShoppingBag, CreditCard, TrendingUp, Download, FileDown } from "lucide-react";
import { exportToPDF, exportToExcel } from "~/lib/export-utils";
import { useCurrency } from "~/hooks/use-tenant-settings";

// Helper for KPIs
function KpiCard({ title, value, icon: Icon, subtext }: { title: string; value: string; icon: any; subtext?: string }) {
    const { formatCurrency } = useCurrency();

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
                <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
                    <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
            </div>
            <div className="mt-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
                {subtext && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtext}</p>}
            </div>
        </div>
    );
}

const COLORS = ["#8b5cf6", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b"];


export default function AnalyticsPage() {
    const { data: kpi, isLoading: kpiLoading } = api.analytics.getKpiStats.useQuery();
    const { data: salesData, isLoading: salesLoading } = api.analytics.getSalesByDate.useQuery({ days: 30 });
    const { data: categoryData, isLoading: categoryLoading } = api.analytics.getTopCategories.useQuery();
    const { formatCurrency } = useCurrency();
    // AI summary
    const { data: aiSummary, isLoading: aiLoading } = api.analytics.getAiSummary.useQuery();

    if (kpiLoading || salesLoading || categoryLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-primary-600)] border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Analytics & Reports
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                    Insights into your business performance.
                </p>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={() => {
                        if (salesData) {
                            exportToPDF(
                                "Sales Report",
                                salesData.map((s) => ({
                                    Date: s.date,
                                    Revenue: `$${Number(s.amount).toFixed(2)}`,
                                    Orders: s.count,
                                })),
                                ["Date", "Revenue", "Orders"]
                            );
                        }
                    }}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                    <Download className="h-4 w-4" />
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
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                    <FileDown className="h-4 w-4" />
                    Export Excel
                </button>
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
                        <div className="h-6 w-6 text-2xl">✨</div>
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
                                    tickFormatter={(value) => formatCurrency(value)}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                                <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
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

