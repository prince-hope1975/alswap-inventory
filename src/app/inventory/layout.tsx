import Link from "next/link";
import {
    LayoutDashboard,
    Package,
    Layers,
    Users,
    ShoppingCart,
    Settings,
    BarChart3,
    FileText,
    UserPlus,
    Menu,
    LogOut,
    Globe,
} from "lucide-react";
import { auth } from "~/server/auth";
import { cn } from "~/lib/utils";
import { LowStockAlerts } from "./low-stock-alerts";
import { ThemeToggle } from "~/components/theme-toggle";
import { api } from "~/trpc/server";
import { RouterProvider } from "~/lib/routerProvider";

export default async function InventoryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    

    // Get tenant settings for company name
    let companyName = "Alswap";
    let companyInitial = "A";
    try {
        const settings = await api.settings.getTenantSettings();
        companyName = settings.name ?? "Alswap";
        companyInitial = companyName[0]?.toUpperCase() ?? "A";
    } catch {
        // Fallback to default if settings not available
    }

    const navItems = [
        { href: "/inventory", label: "Dashboard", icon: LayoutDashboard },
        { href: "/inventory/products", label: "Products", icon: Package },
        { href: "/inventory/categories", label: "Categories", icon: Layers },
        { href: "/inventory/customers", label: "Customers", icon: Users },
        { href: "/inventory/users", label: "Users", icon: UserPlus },
        { href: "/inventory/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/pos", label: "Point of Sale", icon: ShoppingCart },
        { href: "/sales/history", label: "Sales History", icon: FileText },
        { href: "/inventory/settings/store", label: "Online Store", icon: Globe },
        { href: "/inventory/settings", label: "Settings", icon: Settings },
    ];

    return (
        <RouterProvider>
            <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
                <LowStockAlerts />
                {/* Sidebar */}
                <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 md:flex">
                    <div className="flex h-16 items-center border-b border-gray-200 px-6 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)]">
                                <span className="text-lg font-bold text-white">{companyInitial}</span>
                            </div>
                            <span className="bg-gradient-to-r from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)] bg-clip-text text-xl font-bold text-transparent">
                                {companyName}
                            </span>
                        </div>
                    </div>
                    <nav className="flex-1 space-y-1 px-3 py-4">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                                    "text-gray-700 hover:bg-gradient-to-r hover:from-[var(--brand-primary-50)] hover:to-[var(--brand-primary-100)] hover:text-[var(--brand-primary-700)]",
                                    "dark:text-gray-300 dark:hover:bg-gradient-to-r dark:hover:from-[var(--brand-primary-900)]/20 dark:hover:to-[var(--brand-primary-800)]/20 dark:hover:text-[var(--brand-primary-400)]"
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                    <div className="border-t border-gray-200 p-4 dark:border-gray-800">
                        <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 px-3 py-3 dark:from-gray-800 dark:to-gray-700">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)] text-sm font-bold text-white">
                                {session?.user?.name?.[0] ?? "U"}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                    {session?.user?.name}
                                </p>
                                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                    {session?.user?.role}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <ThemeToggle />
                                <Link href="/api/auth/signout" className="rounded-lg p-1.5 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20">
                                    <LogOut className="h-4 w-4 text-gray-500 hover:text-red-500 dark:text-gray-400" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </aside>
                {/* Main Content */}
                <div className="flex flex-1 flex-col">
                    {/* Mobile Header */}
                    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900 md:hidden">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)]">
                                <span className="text-lg font-bold text-white">{companyInitial}</span>
                            </div>
                            <span className="bg-gradient-to-r from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)] bg-clip-text text-xl font-bold text-transparent">
                                {companyName}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <ThemeToggle />
                            <button className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
                                <Menu className="h-6 w-6" />
                            </button>
                        </div>
                    </header>
                    <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
                </div>
            </div>
        </RouterProvider>
    );
}
