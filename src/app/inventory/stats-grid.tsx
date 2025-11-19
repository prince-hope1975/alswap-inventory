import { Package, AlertTriangle, DollarSign, TrendingUp, type LucideIcon } from "lucide-react";

interface StatsGridProps {
    stats: {
        totalProducts: number;
        lowStock: number;
        totalValue: number;
        salesToday: number;
    };
    isLoading?: boolean;
}

export function StatsGrid({ stats, isLoading }: StatsGridProps) {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
                title="Total Products"
                value={stats.totalProducts}
                icon={Package}
                description="Active items in stock"
                gradient="from-blue-500 to-cyan-500"
                isLoading={isLoading}
            />
            <StatsCard
                title="Low Stock Alerts"
                value={stats.lowStock}
                icon={AlertTriangle}
                description="Items below threshold"
                gradient="from-red-500 to-orange-500"
                isLoading={isLoading}
            />
            <StatsCard
                title="Total Value"
                value={`$${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={DollarSign}
                description="Inventory asset value"
                gradient="from-green-500 to-emerald-500"
                isLoading={isLoading}
            />
            <StatsCard
                title="Sales Today"
                value={`$${stats.salesToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={TrendingUp}
                description="Revenue generated today"
                gradient="from-purple-500 to-pink-500"
                isLoading={isLoading}
            />
        </div>
    );
}

function StatsCard({
    title,
    value,
    icon: Icon,
    description,
    gradient,
    isLoading,
}: {
    title: string;
    value: string | number;
    icon: LucideIcon;
    description: string;
    gradient: string;
    isLoading?: boolean;
}) {
    if (isLoading) {
        return (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                    <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="mt-3 space-y-2">
                    <div className="h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                </div>
            </div>
        );
    }

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 transition-opacity group-hover:opacity-5`} />
            <div className="relative">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {title}
                    </h3>
                    <div className={`rounded-lg bg-gradient-to-br ${gradient} p-2`}>
                        <Icon className="h-5 w-5 text-white" />
                    </div>
                </div>
                <div className="mt-3">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">{value}</div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
                </div>
            </div>
        </div>
    );
}

