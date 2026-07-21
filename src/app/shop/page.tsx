import type { Metadata } from "next";

import { HydrateClient, api } from "~/trpc/server";
import { CartProvider } from "../_components/shop/cart-context";
import { StoreLayout } from "../_components/shop/store-layout";
import { PublicStoreUnavailable } from "../_components/shop/public-store-unavailable";

export const metadata: Metadata = {
  title: "Shop electrical products",
  description: "Browse electrical supplies, tools, lighting, power equipment and accessories.",
};

export default async function ShopPage() {
  const [shopDetails, categories, products] = await Promise.all([
    api.shop.getShopDetails(),
    api.shop.getCategories(),
    api.shop.getProducts({ limit: 20 }),
  ]);

  if (!shopDetails.tenant) return <PublicStoreUnavailable />;

  return (
    <HydrateClient>
      <CartProvider>
        <StoreLayout initialShopDetails={shopDetails} initialCategories={categories} initialProducts={products} />
      </CartProvider>
    </HydrateClient>
  );
}
