"use client";

import { useEffect, useState } from "react";
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
    TrendingUp,
    FileText,
    UserPlus,
    Menu,
    LogOut,
    Globe,
    Bell,
    ClipboardList,
    Star,
    Sun,
    ScanLine,
    Receipt,
    type LucideIcon,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { ThemeToggle } from "~/components/theme-toggle";
import { Dialog } from "~/components/ui/dialog";
import { ConfirmProvider } from "~/components/ui/confirm-dialog";
import { LowStockAlert } from "./low-stock-alerts";
import { api } from "~/trpc/react";
import {
    activeNavHref,
    canSeeNavItem,
    groupNavItems,
    isManagerRole,
    type NavSection,
} from "~/lib/domain/staff-nav";

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

type NavItem = { href: string; label: string; icon: LucideIcon; section: NavSection };

const ALL_NAV_ITEMS: NavItem[] = [
    { href: "/inventory", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
    { href: "/inventory/notifications", label: "Notifications", icon: Bell, section: "Overview" },
    { href: "/inventory/products", label: "Products", icon: Package, section: "Catalog" },
    { href: "/inventory/categories", label: "Categories", icon: Layers, section: "Catalog" },
    { href: "/inventory/documents", label: "Document OCR", icon: ScanLine, section: "Catalog" },
    { href: "/inventory/reviews", label: "Reviews", icon: Star, section: "Catalog" },
    { href: "/inventory/articles", label: "Articles", icon: FileText, section: "Catalog" },
    { href: "/pos", label: "Point of Sale", icon: ShoppingCart, section: "Sales" },
    { href: "/inventory/orders", label: "Orders", icon: ClipboardList, section: "Sales" },
    { href: "/sales/history", label: "Sales History", icon: Receipt, section: "Sales" },
    { href: "/inventory/customers", label: "Customers", icon: Users, section: "Sales" },
    { href: "/inventory/solar", label: "Solar Projects", icon: Sun, section: "Sales" },
    { href: "/inventory/analytics", label: "Analytics", icon: BarChart3, section: "Insights" },
    { href: "/inventory/demand", label: "Demand", icon: TrendingUp, section: "Insights" },
    { href: "/inventory/users", label: "Users", icon: UserPlus, section: "Admin" },
    { href: "/inventory/settings/store", label: "Online Store", icon: Globe, section: "Admin" },
    { href: "/inventory/settings", label: "Settings", icon: Settings, section: "Admin" },
];

function Brand({ name, initial, logo }: { name: string; initial: string; logo: string | null }) {
    return (
        <span className="flex min-w-0 items-center gap-2">
            {logo ? (
                <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logo} alt="" className="h-full w-full object-contain" />
                </span>
            ) : (
                <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)] text-lg font-bold text-white"
                >
                    {initial}
                </span>
            )}
            <span className="truncate bg-gradient-to-r from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)] bg-clip-text text-xl font-bold text-transparent">
                {name}
            </span>
        </span>
    );
}

function NavList({
    items,
    activeHref,
    unreadCount,
    onNavigate,
}: {
    items: NavItem[];
    activeHref: string | null;
    unreadCount: number;
    onNavigate?: () => void;
}) {
    const groups = groupNavItems(items);
    return (
        <nav aria-label="Dashboard" className="space-y-5">
            {groups.map((group) => (
                <div key={group.section}>
                    {/* Overview needs no heading: it is the top of the list. */}
                    {group.section !== "Overview" && (
                        <h2 className="mb-1 px-3 text-[11px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                            {group.section}
                        </h2>
                    )}
                    <ul className="space-y-0.5">
                        {group.items.map((item) => {
                            const active = activeHref === item.href;
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        aria-current={active ? "page" : undefined}
                                        onClick={onNavigate}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                            "focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] focus-visible:outline-none",
                                            active
                                                ? "bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] dark:bg-[var(--brand-primary-900)]/30 dark:text-[var(--brand-primary-300)]"
                                                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
                                        )}
                                    >
                                        <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                                        <span className="flex-1">{item.label}</span>
                                        {item.href === "/inventory/notifications" && unreadCount > 0 && (
                                            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--brand-primary-600)] px-2 py-0.5 text-[10px] font-bold text-white">
                                                <span className="sr-only">Unread: </span>
                                                {unreadCount > 99 ? "99+" : unreadCount}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </nav>
    );
}

function UserCard({ user }: { user: InventoryLayoutClientProps["user"] }) {
    return (
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-3 dark:bg-gray-800">
            <div
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)] text-sm font-bold text-white"
            >
                {user.name?.[0] ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                <p className="truncate text-xs text-gray-500 capitalize dark:text-gray-400">{user.role?.toLowerCase()}</p>
            </div>
            <div className="flex items-center gap-1">
                <ThemeToggle />
                <Link
                    href="/api/auth/signout"
                    aria-label="Sign out"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] focus-visible:outline-none dark:text-gray-400 dark:hover:bg-red-900/20"
                >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>
        </div>
    );
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
    const isManager = isManagerRole(user.role);
    const { data: unread } = api.notifications.unreadCount.useQuery(undefined, {
        refetchInterval: 30_000,
        enabled: isManager,
    });
    const unreadCount = unread?.count ?? 0;

    const navItems = ALL_NAV_ITEMS.filter((item) => canSeeNavItem(item.href, user.role));
    const activeHref = activeNavHref(pathname, navItems.map((item) => item.href));
    const brand = <Brand name={companyName} initial={companyInitial} logo={companyLogo} />;

    // Close the mobile menu after client-side navigation.
    useEffect(() => setIsSidebarOpen(false), [pathname]);

    return (
        <ConfirmProvider>
            <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
                {/* Desktop Sidebar */}
                <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white md:flex dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex h-16 shrink-0 items-center border-b border-gray-200 px-5 dark:border-gray-800">
                        <Link
                            href={isManager ? "/inventory" : "/pos"}
                            className="min-w-0 rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] focus-visible:outline-none"
                        >
                            {brand}
                        </Link>
                    </div>
                    <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
                        <LowStockAlert enabled={isManager} />
                        <NavList items={navItems} activeHref={activeHref} unreadCount={unreadCount} />
                    </div>
                    <div className="shrink-0 border-t border-gray-200 p-3 dark:border-gray-800">
                        <UserCard user={user} />
                    </div>
                </aside>

                {/* Mobile navigation drawer */}
                <Dialog
                    open={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    title={brand}
                    ariaLabel="Navigation menu"
                    closeLabel="Close menu"
                    variant="left"
                    bodyClassName="flex flex-col"
                >
                    <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
                        <LowStockAlert enabled={isManager} onNavigate={() => setIsSidebarOpen(false)} />
                        <NavList
                            items={navItems}
                            activeHref={activeHref}
                            unreadCount={unreadCount}
                            onNavigate={() => setIsSidebarOpen(false)}
                        />
                    </div>
                    <div className="shrink-0 border-t border-gray-200 p-3 dark:border-gray-800">
                        <UserCard user={user} />
                    </div>
                </Dialog>

                {/* Main Content */}
                <div className="flex min-w-0 flex-1 flex-col">
                    {/* Mobile Header */}
                    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 md:hidden dark:border-gray-800 dark:bg-gray-900">
                        {brand}
                        <div className="flex shrink-0 items-center gap-1">
                            <LowStockAlert enabled={isManager} compact />
                            <ThemeToggle />
                            <button
                                type="button"
                                onClick={() => setIsSidebarOpen(true)}
                                aria-label="Open menu"
                                aria-expanded={isSidebarOpen}
                                aria-haspopup="dialog"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] focus-visible:outline-none dark:text-gray-400 dark:hover:bg-gray-800"
                            >
                                <Menu className="h-6 w-6" aria-hidden="true" />
                            </button>
                        </div>
                    </header>
                    <main id="main-content" className="flex-1 p-4 md:p-8">
                        {children}
                    </main>
                </div>
            </div>
        </ConfirmProvider>
    );
}
