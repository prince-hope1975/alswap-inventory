"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

import { CartProvider } from "~/app/_components/shop/cart-context";
import { CartDrawer } from "~/app/_components/shop/cart-drawer";
import { CheckoutModal } from "~/app/_components/shop/checkout-modal";
import { ShopNavbar } from "~/app/_components/shop/parts/shop-navbar";
import { type RouterOutputs } from "~/trpc/react";

type Tenant = NonNullable<RouterOutputs["shop"]["getShopDetails"]["tenant"]>;

/** Same brand ramp the storefront wrapper sets, so the navbar matches /shop. */
const BRAND_VARS = {
  "--brand-primary-300": "#8dc5dc",
  "--brand-primary-400": "#45a0c6",
  "--brand-primary-500": "#167da8",
  "--brand-primary-600": "#0b6e99",
  "--brand-primary-700": "#07597d",
  "--brand-primary-800": "#112b3c",
} as CSSProperties;

/**
 * Client frame for the server-rendered product page: one CartProvider shared
 * by the navbar badge, the buy box and the cart drawer, so they never hold
 * separate copies of the cart.
 */
export function ProductPageShell({
  tenant,
  children,
}: {
  tenant: Tenant;
  children: ReactNode;
}) {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <CartProvider>
      <div style={BRAND_VARS}>
        <ShopNavbar
          tenant={tenant}
          search={search}
          setSearch={setSearch}
          showSearch={false}
        />
        {/* The navbar is fixed and h-20. */}
        <div className="pt-20">{children}</div>
        <CartDrawer onCheckout={() => setIsCheckoutOpen(true)} />
        {isCheckoutOpen && (
          <CheckoutModal onClose={() => setIsCheckoutOpen(false)} />
        )}
      </div>
    </CartProvider>
  );
}
