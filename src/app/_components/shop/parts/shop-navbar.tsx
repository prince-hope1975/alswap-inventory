"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { ShoppingCart, Search, Menu, X, User, LayoutDashboard } from "lucide-react";
import { useCart } from "../cart-context";
import { useState } from "react";
import { type RouterOutputs } from "~/trpc/react";
import { ThemeToggle } from "~/components/theme-toggle";

type Tenant = NonNullable<RouterOutputs["shop"]["getShopDetails"]["tenant"]>;

interface ShopNavbarProps {
    tenant: Tenant | null | undefined;
    search: string;
    setSearch: (value: string) => void;
    showSearch?: boolean;
    className?: string;
}

export function ShopNavbar({ tenant, search, setSearch, showSearch = true, className = "" }: ShopNavbarProps) {
    const { data: session } = useSession();
    const { totalItems, setIsCartOpen } = useCart();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <nav className={`fixed top-0 left-0 right-0 z-40 border-b border-[#14212b]/15 bg-[#f6f4ee]/95 text-[#14212b] backdrop-blur-md dark:border-white/10 dark:bg-[#0a1117]/95 dark:text-white ${className}`}>
            <div className="container mx-auto flex h-20 items-center justify-between px-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    {tenant?.logo ? (
                        <div className="relative h-10 w-10 overflow-hidden rounded-xl">
                             {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src={tenant.logo} 
                                alt={tenant.name || "Store Logo"} 
                                className="h-full w-full object-contain bg-white" 
                            />
                        </div>
                    ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-primary-600)] to-[var(--brand-primary-800)] font-bold text-white shadow-lg shadow-[var(--brand-primary-500)]/20">
                            {tenant?.name?.charAt(0) || "A"}
                        </div>
                    )}
                    <span className="text-xl font-bold tracking-tight hidden sm:block">
                        {tenant?.name || "Store"}
                    </span>
                </Link>

                {/* Primary Nav (desktop) */}
                <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#41515c] dark:text-gray-300">
                    <Link href="/shop" className="hover:text-[#0b6e99] dark:hover:text-white transition-colors">
                        Shop
                    </Link>
                    <Link href="/about" className="hover:text-[#0b6e99] dark:hover:text-white transition-colors">
                        About Us
                    </Link>
                    <Link href="/find-us" className="hover:text-[#0b6e99] dark:hover:text-white transition-colors">
                        Find Us
                    </Link>
                </div>

                {/* Search Bar - Desktop */}
                {showSearch && (
                    <div className="hidden md:flex max-w-md flex-1 mx-8">
                        <div className="relative w-full group">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--brand-primary-400)] transition-colors" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-full bg-white border border-[#14212b]/15 py-2.5 pl-10 pr-4 text-sm text-[#14212b] placeholder-gray-500 focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary-500)] dark:bg-white/5 dark:border-white/10 dark:text-white dark:focus:bg-white/10 transition-all"
                            />
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-4">
                    {/* Theme Toggle */}
                    <div className="hidden sm:block">
                        <ThemeToggle />
                    </div>

                    {/* User Menu */}
                    {session?.user?.role === "ADMIN" ? (
                        <div className="hidden md:flex items-center gap-4">
                            <Link
                                href="/inventory"
                                className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#14212b] hover:bg-[#dcecf2] dark:bg-white/5 dark:text-white dark:hover:bg-white/10 transition-colors"
                            >
                                <LayoutDashboard className="h-4 w-4" />
                                Dashboard
                            </Link>
                            <button
                                onClick={() => signOut()}
                                className="text-sm font-medium text-[#5c6870] hover:text-[#14212b] dark:text-gray-400 dark:hover:text-white transition-colors"
                            >
                                Sign Out
                            </button>
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--brand-primary-500)] to-[var(--brand-primary-700)] flex items-center justify-center text-xs font-bold">
                                {session.user?.name?.charAt(0) || "U"}
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => signIn()}
                            className="hidden md:flex items-center gap-2 text-sm font-medium text-[#5c6870] hover:text-[#14212b] dark:text-gray-400 dark:hover:text-white transition-colors"
                        >
                            <User className="h-4 w-4" />
                            Sign In
                        </button>
                    )}

                    {/* Cart Trigger */}
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="relative rounded-full bg-white p-2.5 text-[#41515c] hover:bg-[#dcecf2] hover:text-[#14212b] dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                    >
                        <ShoppingCart className="h-5 w-5" />
                        {totalItems > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-primary-600)] text-[10px] font-bold text-white shadow-lg">
                                {totalItems}
                            </span>
                        )}
                    </button>

                    {/* Mobile Menu Trigger */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden rounded-full p-2 text-[#41515c] hover:bg-[#dcecf2] dark:text-gray-300 dark:hover:bg-white/10"
                    >
                        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Search & Menu */}
            {isMobileMenuOpen && (
                <div className="border-t border-[#14212b]/15 bg-[#f6f4ee] p-4 dark:border-white/5 dark:bg-[#0a1117] md:hidden">
                    {showSearch && (
                        <div className="mb-4 relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-lg bg-white border border-[#14212b]/15 py-2.5 pl-10 pr-4 text-sm text-[#14212b] focus:border-[var(--brand-primary-500)] focus:outline-none dark:bg-white/5 dark:border-white/10 dark:text-white"
                            />
                        </div>
                    )}
                    <div className="flex flex-col gap-2">
                        {/* Mobile Nav Links */}
                        <Link
                            href="/about"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="rounded-lg bg-white/5 px-4 py-3 text-sm font-medium text-white"
                        >
                            About Us
                        </Link>
                        <Link
                            href="/find-us"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="rounded-lg bg-white/5 px-4 py-3 text-sm font-medium text-white"
                        >
                            Find Us
                        </Link>

                        {/* Mobile Theme Toggle */}
                        <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3 text-sm font-medium text-white mb-2">
                            <span>Theme</span>
                            <ThemeToggle />
                        </div>

                        {session ? (
                            <>
                                <Link
                                    href="/inventory"
                                    className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-3 text-sm font-medium text-white"
                                >
                                    <LayoutDashboard className="h-4 w-4" />
                                    Dashboard
                                </Link>
                                <button
                                    onClick={() => signOut()}
                                    className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-gray-400 hover:text-white"
                                >
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => signIn()}
                                className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-3 text-sm font-medium text-white"
                            >
                                <User className="h-4 w-4" />
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
