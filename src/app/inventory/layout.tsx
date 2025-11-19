import Link from "next/link";
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Settings,
    Menu,
    LogOut,
} from "lucide-react";
import { auth } from "~/server/auth";
import { cn } from "~/lib/utils";

export default async function InventoryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    const navItems = [
        { href: "/inventory", label: "Dashboard", icon: LayoutDashboard },
        { href: "/inventory/products", label: "Products", icon: Package },
        { href: "/pos", label: "Point of Sale", icon: ShoppingCart },
        { href: "/inventory/settings", label: "Settings", icon: Settings },
    ];

    return (
        <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
            {/* Sidebar */}
            <aside className="hidden w-64 flex-col border-r bg-white dark:bg-gray-800 md:flex">
                <div className="flex h-16 items-center border-b px-6">
                    <span className="text-xl font-bold text-purple-600">Alswap</span>
                </div>
                <nav className="flex-1 space-y-1 px-4 py-4">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700",
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <div className="border-t p-4">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                            {session?.user?.name?.[0] ?? "U"}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                {session?.user?.name}
                            </p>
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                {session?.user?.role}
                            </p>
                        </div>
                        <Link href="/api/auth/signout">
                            <LogOut className="h-5 w-5 text-gray-500 hover:text-red-500" />
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex flex-1 flex-col">
                {/* Mobile Header */}
                <header className="flex h-16 items-center justify-between border-b bg-white px-4 dark:bg-gray-800 md:hidden">
                    <span className="text-xl font-bold text-purple-600">Alswap</span>
                    <button className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
                        <Menu className="h-6 w-6" />
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
            </div>
        </div>
    );
}
