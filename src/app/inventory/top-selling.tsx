import { useCurrency } from "~/hooks/use-tenant-settings";

interface TopSellingProps {
    products: {
        productId: string;
        name: string;
        category: string | null;
        totalSold: number;
        totalRevenue: number;
    }[];
    isLoading?: boolean;
}

export function TopSelling({ products, isLoading }: TopSellingProps) {
    const { formatCurrency } = useCurrency();

    if (isLoading) {
        return (
            <div className="col-span-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Top Selling Items</h3>
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
                                <div className="space-y-2">
                                    <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                    <div className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                </div>
                            </div>
                            <div className="h-4 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="col-span-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Top Selling Items</h3>
            {products.length === 0 ? (
                <div className="flex h-[200px] flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
                    <p>No sales data yet</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {products.map((item, i) => (
                        <div key={item.productId} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-primary-500)] to-[var(--brand-gradient-to)] text-sm font-bold text-white">
                                    {i + 1}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                                        {item.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {item.category ?? "Uncategorized"} • {item.totalSold} sold
                                    </p>
                                </div>
                            </div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(item.totalRevenue)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

