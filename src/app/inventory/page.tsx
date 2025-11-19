import Link from "next/link";
import { Package, AlertTriangle, TrendingUp, DollarSign, type LucideIcon } from "lucide-react";

export default async function InventoryDashboard() {
    // In a real app, we would fetch these stats from the API
    // const stats = await api.inventory.getStats();
    const stats = {
        totalProducts: 120,
        lowStock: 5,
        totalValue: 15000,
        salesToday: 1200,
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Dashboard
                </h1>
                <div className="flex items-center gap-2">
                    <Link
                        href="/inventory/products/new"
                        className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                    >
                        Add Product
                    </Link>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Products"
                    value={stats.totalProducts}
                    icon={Package}
                    description="Active items in stock"
                />
                <StatsCard
                    title="Low Stock Alerts"
                    value={stats.lowStock}
                    icon={AlertTriangle}
                    description="Items below threshold"
                    alert
                />
                <StatsCard
                    title="Total Value"
                    value={`$${stats.totalValue.toLocaleString()}`}
                    icon={DollarSign}
                    description="Inventory asset value"
                />
                <StatsCard
                    title="Sales Today"
                    value={`$${stats.salesToday.toLocaleString()}`}
                    icon={TrendingUp}
                    description="+12% from yesterday"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-800">
                    <h3 className="mb-4 text-lg font-medium">Recent Activity</h3>
                    <div className="h-[200px] flex items-center justify-center text-gray-500">
                        Chart Placeholder
                    </div>
                </div>
                <div className="col-span-3 rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-800">
                    <h3 className="mb-4 text-lg font-medium">Top Selling Items</h3>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700" />
                                    <div>
                                        <p className="text-sm font-medium">Product {i}</p>
                                        <p className="text-xs text-gray-500">Category A</p>
                                    </div>
                                </div>
                                <div className="text-sm font-medium">$120.00</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatsCard({
    title,
    value,
    icon: Icon,
    description,
    alert,
}: {
    title: string;
    value: string | number;
    icon: LucideIcon;
    description: string;
    alert?: boolean;
}) {
    return (
        <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-800">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium tracking-tight text-gray-500 dark:text-gray-400">
                    {title}
                </h3>
                <Icon
                    className={`h-4 w-4 ${alert ? "text-red-500" : "text-gray-500"}`}
                />
            </div>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
    );
}
