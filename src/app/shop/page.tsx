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
import { CrawlableCategoryLinks } from "../_components/shop/crawlable-category-links";
import {
  SHOP_PAGE_SIZE,
  parseShopUrlState,
  priceFilterToQuery,
} from "~/lib/domain/shop-filters";

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
  sort?: string;
  /** "tile" marks a homepage shortcut link, not a customer-typed search. */
  src?: string;
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
  const rawParams = await searchParams;
  const params = rawParams as ShopSearchParams;
  const urlState = parseShopUrlState(rawParams);
  const search = urlState.search || undefined;
  const categoryId = urlState.categoryId;
  const condition = parseConditions(first(params.condition));
  const sort = urlState.sort ?? undefined;

  const [shopDetails, categories, products] = await Promise.all([
    api.shop.getShopDetails(),
    // A catalogue hiccup must not take the whole store down: render the
    // shell with no prefetched data and let the client query retry.
    api.shop.getCategories().catch((error: unknown) => {
      console.error("[shop] categories prefetch failed", error);
      return undefined;
    }),
    // Must match the client's first page exactly so it reuses this result.
    api.shop
      .getProducts({
        limit: SHOP_PAGE_SIZE,
        search,
        categoryId,
        condition,
        sort,
        ...priceFilterToQuery(urlState.price),
        inStockOnly: urlState.inStock || undefined,
      })
      .catch((error: unknown) => {
        console.error("[shop] products prefetch failed", error);
        return undefined;
      }),
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
          // A search arriving by URL (e.g. Google's sitelinks search box) is
          // real customer intent; our own homepage tiles are not.
          logInitialSearch={Boolean(search) && first(params.src) !== "tile"}
          initialCategoryId={categoryId}
          initialCondition={condition}
          initialSort={sort}
          initialPrice={urlState.price}
          initialInStock={urlState.inStock}
        />
        {/* Real department links for crawlers, below the grid so they never
            sit hidden under the fixed navbar or push products down. */}
        {categories && <CrawlableCategoryLinks categories={categories} />}
      </CartProvider>
    </HydrateClient>
  );
}
