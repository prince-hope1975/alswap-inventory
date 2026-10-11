"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  ShoppingCart,
  Search,
  Menu,
  X,
  LayoutDashboard,
} from "lucide-react";
import { useCart } from "../cart-context";
import { useState } from "react";
import { type RouterOutputs } from "~/trpc/react";
import { StorefrontThemeToggle } from "./storefront-theme-toggle";
import { StorefrontImage } from "../storefront-image";

type Tenant = NonNullable<RouterOutputs["shop"]["getShopDetails"]["tenant"]>;

interface ShopNavbarProps {
  tenant: Tenant | null | undefined;
  search: string;
  setSearch: (value: string) => void;
  showSearch?: boolean;
  className?: string;
}

/** Element id of the always-visible mobile search box (focused by the bottom nav). */
export const MOBILE_SEARCH_INPUT_ID = "shop-search-mobile";

const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/guides", label: "Guides" },
  { href: "/about", label: "About Us" },
  { href: "/find-us", label: "Find Us" },
];

/** Enter submits: drop focus so the phone keyboard closes over the results. */
function blurOnSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
  document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const mobileItemClass =
  "flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-[#14212b] hover:bg-[#dcecf2] dark:bg-white/5 dark:text-white dark:hover:bg-white/10";

export function ShopNavbar({
  tenant,
  search,
  setSearch,
  showSearch = true,
  className = "",
}: ShopNavbarProps) {
  const { data: session } = useSession();
  const { totalItems, setIsCartOpen } = useCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const role = session?.user?.role;
  const isStaff = role === "ADMIN" || role === "MANAGER";
  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav
      aria-label="Main"
      className={`fixed top-0 right-0 left-0 z-40 border-b border-[#14212b]/15 bg-[#f6f4ee]/95 text-[#14212b] backdrop-blur-md dark:border-white/10 dark:bg-[#0a1117]/95 dark:text-white ${className}`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-4 md:h-20">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {tenant?.logo ? (
            <div className="relative h-10 w-10 overflow-hidden rounded-xl">
              <StorefrontImage
                src={tenant.logo}
                alt={tenant.name ?? "Store Logo"}
                fill
                sizes="2.5rem"
                priority
                className="bg-white object-contain"
              />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-primary-600)] to-[var(--brand-primary-800)] font-bold text-white shadow-[var(--brand-primary-500)]/20 shadow-lg">
              {tenant?.name?.charAt(0) ?? "A"}
            </div>
          )}
          <span className="hidden text-xl font-bold tracking-tight sm:block">
            {tenant?.name ?? "Store"}
          </span>
        </Link>

        {/* Primary Nav (desktop) */}
        <div className="hidden items-center gap-6 text-sm font-medium text-[#41515c] lg:flex dark:text-gray-300">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-[#0b6e99] dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Search Bar - Desktop */}
        <Link href="/blog" className="inline-flex min-h-11 items-center px-2 text-sm font-bold hover:underline">
          Blog
        </Link>
        {showSearch && (
          <form
            role="search"
            aria-label="Products"
            onSubmit={blurOnSubmit}
            className="mx-4 hidden max-w-md flex-1 md:flex lg:mx-8"
          >
            <div className="group relative w-full">
              <Search
                className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-[var(--brand-primary-400)]"
                aria-hidden
              />
              <input
                type="search"
                aria-label="Search products"
                enterKeyHint="search"
                placeholder="Search cables, bulbs, breakers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-[#14212b]/15 bg-white py-2.5 pr-4 pl-10 text-sm text-[#14212b] placeholder-gray-500 transition-all focus:border-[var(--brand-primary-500)] focus:ring-2 focus:ring-[var(--brand-primary-500)]/60 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
              />
            </div>
          </form>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Theme Toggle */}
          <div className="hidden sm:block">
            <StorefrontThemeToggle />
          </div>

          {/* Staff menu (shoppers never see a sign-in prompt; staff use /auth/signin) */}
          {session ? (
            <div className="hidden items-center gap-4 md:flex">
              {isStaff && (
                <Link
                  href="/inventory"
                  className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#14212b] transition-colors hover:bg-[#dcecf2] dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  <LayoutDashboard className="h-4 w-4" aria-hidden />
                  Dashboard
                </Link>
              )}
              <button
                type="button"
                onClick={() => signOut()}
                className="text-sm font-medium text-[#5c6870] transition-colors hover:text-[#14212b] dark:text-gray-400 dark:hover:text-white"
              >
                Sign Out
              </button>
            </div>
          ) : null}

          {/* Cart Trigger */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            aria-label={totalItems > 0 ? `Open cart, ${totalItems} item${totalItems === 1 ? "" : "s"}` : "Open cart"}
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#41515c] transition-colors hover:bg-[#dcecf2] hover:text-[#14212b] focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:outline-none dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f5a623] px-1 text-[10px] font-bold text-[#14212b] shadow">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </button>

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="shop-mobile-menu"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#41515c] hover:bg-[#dcecf2] focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:outline-none md:hidden dark:text-gray-300 dark:hover:bg-white/10"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden />
            ) : (
              <Menu className="h-6 w-6" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {/* Mobile search: always visible so shoppers never hunt behind the menu. */}
      {showSearch && (
        <form
          role="search"
          aria-label="Products"
          onSubmit={blurOnSubmit}
          className="container mx-auto px-4 pb-3 md:hidden"
        >
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              id={MOBILE_SEARCH_INPUT_ID}
              type="search"
              aria-label="Search products"
              enterKeyHint="search"
              placeholder="Search cables, bulbs, breakers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-full border border-[#14212b]/15 bg-white pr-4 pl-10 text-base text-[#14212b] placeholder-gray-500 focus:border-[var(--brand-primary-500)] focus:ring-2 focus:ring-[var(--brand-primary-500)]/60 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
        </form>
      )}

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          id="shop-mobile-menu"
          className="border-t border-[#14212b]/15 bg-[#f6f4ee] p-4 md:hidden dark:border-white/5 dark:bg-[#0a1117]"
        >
          <div className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={closeMenu} className={mobileItemClass}>
                {link.label}
              </Link>
            ))}

            <div className={`${mobileItemClass} justify-between`}>
              <span>Dark mode</span>
              <StorefrontThemeToggle />
            </div>

            {session ? (
              <>
                {isStaff && (
                  <Link href="/inventory" onClick={closeMenu} className={mobileItemClass}>
                    <LayoutDashboard className="h-4 w-4" aria-hidden />
                    Dashboard
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="flex min-h-11 items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-[#5c6870] hover:text-[#14212b] dark:text-gray-400 dark:hover:text-white"
                >
                  Sign Out
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </nav>
  );
}
