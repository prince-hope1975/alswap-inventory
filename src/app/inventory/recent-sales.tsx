import { ShoppingBag, User } from "lucide-react";

interface RecentSalesProps {
    sales: {
        id: string;
        totalAmount: string;
        createdAt: Date;
        customer: {
            name: string;
            email: string | null;
        } | null;
    }[];
    isLoading?: boolean;
}

export function RecentSales({ sales, isLoading }: RecentSalesProps) {
    if (isLoading) {
        return (
            <div className="col-span-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
                                <div className="space-y-2">
                                    <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                    <div className="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                </div>
                            </div>
                            <div className="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="col-span-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
            {sales.length === 0 ? (
                <div className="flex h-[200px] flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
                    <ShoppingBag className="mb-2 h-8 w-8 opacity-20" />
                    <p>No recent sales found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sales.map((sale) => (
                        <div key={sale.id} className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                    <User className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {sale.customer?.name ?? "Guest Customer"}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Receipt #{sale.id.slice(0, 8)}
                                    </p>
                                </div>
                            </div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                                +${Number(sale.totalAmount).toFixed(2)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

