"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
    X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { ThemeToggle } from "~/components/theme-toggle";
import { LowStockAlerts } from "./low-stock-alerts";

interface InventoryLayoutClientProps {
    children: React.ReactNode;
    companyName: string;
    companyInitial: string;
    companyLogo: string | null;
    user: {
        name?: string | null;
        role?: string;
    };
}

export function InventoryLayoutClient({
    children,
    companyName,
    companyInitial,
    companyLogo,
    user,
}: InventoryLayoutClientProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();

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

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
            <LowStockAlerts />
            
            {/* Desktop Sidebar */}
            <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 md:flex">
                <div className="flex h-16 items-center border-b border-gray-200 px-6 dark:border-gray-800">
                     <div className="flex items-center gap-2">
                        {companyLogo ? (
                            <div className="relative h-8 w-8 overflow-hidden rounded-lg">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                    src={companyLogo} 
                                    alt={companyName} 
                                    className="h-full w-full object-contain"
                                />
                            </div>
                        ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)]">
                                <span className="text-lg font-bold text-white">{companyInitial}</span>
                            </div>
                        )}
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
                                "dark:text-gray-300 dark:hover:bg-gradient-to-r dark:hover:from-[var(--brand-primary-900)]/20 dark:hover:to-[var(--brand-primary-800)]/20 dark:hover:text-[var(--brand-primary-400)]",
                                pathname === item.href && "bg-gradient-to-r from-[var(--brand-primary-50)] to-[var(--brand-primary-100)] text-[var(--brand-primary-700)] dark:from-[var(--brand-primary-900)]/20 dark:to-[var(--brand-primary-800)]/20 dark:text-[var(--brand-primary-400)]"
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
                            {user.name?.[0] ?? "U"}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                {user.name}
                            </p>
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                {user.role}
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

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 transform bg-white transition-transform duration-200 ease-in-out dark:bg-gray-900 md:hidden",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                 <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6 dark:border-gray-800">
                     <div className="flex items-center gap-2">
                        {companyLogo ? (
                            <div className="relative h-8 w-8 overflow-hidden rounded-lg">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                    src={companyLogo} 
                                    alt={companyName} 
                                    className="h-full w-full object-contain"
                                />
                            </div>
                        ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)]">
                                <span className="text-lg font-bold text-white">{companyInitial}</span>
                            </div>
                        )}
                        <span className="bg-gradient-to-r from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)] bg-clip-text text-xl font-bold text-transparent">
                            {companyName}
                        </span>
                    </div>
                    <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                 <nav className="flex-1 space-y-1 px-3 py-4">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsSidebarOpen(false)}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                                "text-gray-700 hover:bg-gradient-to-r hover:from-[var(--brand-primary-50)] hover:to-[var(--brand-primary-100)] hover:text-[var(--brand-primary-700)]",
                                "dark:text-gray-300 dark:hover:bg-gradient-to-r dark:hover:from-[var(--brand-primary-900)]/20 dark:hover:to-[var(--brand-primary-800)]/20 dark:hover:text-[var(--brand-primary-400)]",
                                pathname === item.href && "bg-gradient-to-r from-[var(--brand-primary-50)] to-[var(--brand-primary-100)] text-[var(--brand-primary-700)] dark:from-[var(--brand-primary-900)]/20 dark:to-[var(--brand-primary-800)]/20 dark:text-[var(--brand-primary-400)]"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.label}
                        </Link>
                    ))}
                </nav>
                 <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-4 dark:border-gray-800">
                    <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 px-3 py-3 dark:from-gray-800 dark:to-gray-700">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)] text-sm font-bold text-white">
                            {user.name?.[0] ?? "U"}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                {user.name}
                            </p>
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                {user.role}
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
            </div>

            {/* Main Content */}
            <div className="flex flex-1 flex-col">
                {/* Mobile Header */}
                <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900 md:hidden">
                    <div className="flex items-center gap-2">
                        {companyLogo ? (
                            <div className="relative h-8 w-8 overflow-hidden rounded-lg">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                    src={companyLogo} 
                                    alt={companyName} 
                                    className="h-full w-full object-contain"
                                />
                            </div>
                        ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)]">
                                <span className="text-lg font-bold text-white">{companyInitial}</span>
                            </div>
                        )}
                        <span className="bg-gradient-to-r from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)] bg-clip-text text-xl font-bold text-transparent">
                            {companyName}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button 
                            onClick={toggleSidebar}
                            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
            </div>
        </div>
    );
}

