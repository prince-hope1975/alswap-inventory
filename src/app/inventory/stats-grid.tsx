import { Package, AlertTriangle, DollarSign, TrendingUp, type LucideIcon } from "lucide-react";
import { useCurrency } from "~/hooks/use-tenant-settings";

interface StatsGridProps {
    stats: {
        totalProducts: number;
        productsWithUnknownQuantity?: number;
        lowStock: number;
        totalValueConfirmed?: number;
        totalValueEstimated?: number;
        totalValue?: number; // Backward compatibility
        salesToday: number;
    };
    isLoading?: boolean;
}

export function StatsGrid({ stats, isLoading }: StatsGridProps) {
    const { formatCurrency } = useCurrency();
    const unknownCount = stats.productsWithUnknownQuantity ?? 0;
    const confirmedValue = stats.totalValueConfirmed ?? stats.totalValue ?? 0;
    const estimatedValue = stats.totalValueEstimated ?? stats.totalValue ?? 0;

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
                title="Total Products"
                value={stats.totalProducts}
                icon={Package}
                description={unknownCount > 0 ? `${unknownCount} with unknown quantity` : "Active items in stock"}
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
                title="Stock Value (Confirmed)"
                value={formatCurrency(confirmedValue)}
                icon={DollarSign}
                description={unknownCount > 0 ? `Excludes ${unknownCount} unknown` : "Inventory asset value"}
                gradient="from-green-500 to-emerald-500"
                isLoading={isLoading}
            />
            <StatsCard
                title="Sales Today"
                value={formatCurrency(stats.salesToday)}
                icon={TrendingUp}
                description="Revenue generated today"
                gradient="from-[var(--brand-primary-500)] to-[var(--brand-gradient-to)]"
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

