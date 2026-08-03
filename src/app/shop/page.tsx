import type { Metadata } from "next";

import { HydrateClient, api } from "~/trpc/server";
import { CartProvider } from "../_components/shop/cart-context";
import { StoreLayout } from "../_components/shop/store-layout";
import { PublicStoreUnavailable } from "../_components/shop/public-store-unavailable";
import { requestBaseUrl, requestHost } from "~/lib/seo/base-url";
import {
  buildLandingMetadata,
  getSocialLanding,
} from "~/lib/seo/social-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const [base, rawHost] = await Promise.all([requestBaseUrl(), requestHost()]);
  return buildLandingMetadata(base, getSocialLanding(rawHost, "shop"));
}

type ProductCondition = "NEW" | "USED" | "REFURBISHED";
const PRODUCT_CONDITIONS: ProductCondition[] = ["NEW", "USED", "REFURBISHED"];

type ShopSearchParams = {
  search?: string;
  categoryId?: string;
  condition?: string;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * `?condition=USED,REFURBISHED` — what the `used.` surface rewrites `/` to.
 * Unknown values are dropped rather than passed through, so a hand-edited URL
 * can't reach the router with an invalid enum.
 */
function parseConditions(raw: string | undefined) {
  const values = (raw ?? "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is ProductCondition =>
      PRODUCT_CONDITIONS.includes(value as ProductCondition),
    );
  return values.length ? Array.from(new Set(values)) : undefined;
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
  const search = first(params.search)?.trim() ?? undefined;
  const rawCategoryId = Number(first(params.categoryId));
  const categoryId =
    Number.isFinite(rawCategoryId) && rawCategoryId > 0
      ? rawCategoryId
      : undefined;
  const condition = parseConditions(first(params.condition));

  const [shopDetails, categories, products] = await Promise.all([
    api.shop.getShopDetails(),
    api.shop.getCategories(),
    api.shop.getProducts({ limit: 20, search, categoryId, condition }),
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
          initialCondition={condition}
        />
      </CartProvider>
    </HydrateClient>
  );
}
