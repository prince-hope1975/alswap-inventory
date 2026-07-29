import type { Metadata } from "next";

import { HydrateClient, api } from "~/trpc/server";
import { CartProvider } from "../_components/shop/cart-context";
import { StoreLayout } from "../_components/shop/store-layout";
import { PublicStoreUnavailable } from "../_components/shop/public-store-unavailable";

export const metadata: Metadata = {
  title: "Shop electrical products",
  description: "Browse electrical supplies, tools, lighting, power equipment and accessories.",
};

type ShopSearchParams = {
  search?: string;
  categoryId?: string;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Until now this page ignored searchParams entirely, so the department tiles
  // on the homepage that link to /shop?search=... silently rendered the full
  // unfiltered catalog.
  const params = (await searchParams) as ShopSearchParams;
  const search = first(params.search)?.trim() || undefined;
  const rawCategoryId = Number(first(params.categoryId));
  const categoryId = Number.isFinite(rawCategoryId) && rawCategoryId > 0 ? rawCategoryId : undefined;

  const [shopDetails, categories, products] = await Promise.all([
    api.shop.getShopDetails(),
    api.shop.getCategories(),
    api.shop.getProducts({ limit: 20, search, categoryId }),
  ]);

  if (!shopDetails.tenant) return <PublicStoreUnavailable />;

  return (
    <HydrateClient>
      <CartProvider>
        <StoreLayout
          initialShopDetails={shopDetails}
          initialCategories={categories}
          initialProducts={products}
          initialSearch={search}
          initialCategoryId={categoryId}
        />
      </CartProvider>
    </HydrateClient>
  );
}
