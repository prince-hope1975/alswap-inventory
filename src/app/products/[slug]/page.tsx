import type { Metadata } from "next";
import { and, avg, eq, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, PhoneCall, Truck, Wallet } from "lucide-react";

import { ProductBuyBox } from "~/app/_components/shop/product-buy-box";
import { StockBadge } from "~/app/_components/shop/parts/stock-badge";
import { formatMoney } from "~/lib/domain/checkout";
import { ProductGallery } from "./product-gallery";
import { ProductPageShell } from "./product-page-shell";
import { buildBreadcrumbs, buildProduct } from "~/lib/seo/builders";
import { JsonLd } from "~/lib/seo/json-ld";
import { canonicalUrl } from "~/lib/seo/base-url";
import {
  isAvailable,
  productMetaDescription,
  productMetaTitle,
  shownPrice,
} from "~/lib/seo/commerce-copy";
import { db } from "~/server/db";
import { products, reviews } from "~/server/db/schema";
import { productPageColumns, publicProductRelations } from "~/server/shop/public-product";
import { resolvePublicTenant } from "~/server/tenant";
import { TrackedLink } from "~/components/tracked-link";

async function getProduct(slug: string) {
  const tenant = await resolvePublicTenant(db, new Headers(await headers()));
  if (!tenant) return null;
  const product = await db.query.products.findFirst({
    where: and(
      eq(products.tenantId, tenant.id),
      eq(products.visibility, "PUBLISHED"),
      or(eq(products.slug, slug), eq(products.id, slug)),
    ),
    columns: productPageColumns,
    with: publicProductRelations,
  });
  return product ? { tenant, product } : null;
}

async function getApprovedRating(tenantId: string, productId: string) {
  const [result] = await db
    .select({ average: avg(reviews.rating), count: sql<number>`count(*)` })
    .from(reviews)
    .where(
      and(
        eq(reviews.tenantId, tenantId),
        eq(reviews.productId, productId),
        eq(reviews.isApproved, true),
      ),
    );
  if (!result?.average || Number(result.count) === 0) return null;
  return { average: Number(result.average), count: Number(result.count) };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProduct(slug);
  if (!result) return { title: "Product not found" };
  const { product, tenant } = result;
  const price = shownPrice(product.price, product.salePrice);
  // The store name is appended by the root layout's title template.
  const title = productMetaTitle(product.name, price, tenant.location);
  const description = productMetaDescription({
    name: product.name,
    price,
    currency: tenant.currency,
    available: isAvailable(product.stockQuantity),
    storeName: tenant.name,
    location: tenant.location,
    description: product.description,
  });
  const canonical = await canonicalUrl(
    `/products/${product.slug ?? product.id}`,
  );
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: product.image ? [product.image] : undefined,
      type: "website",
    },
    twitter: {
      card: product.image ? "summary_large_image" : "summary",
      title,
      description,
      images: product.image ? [product.image] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getProduct(slug);
  if (!result) notFound();
  const { tenant, product } = result;
  const price = product.salePrice ?? product.price;
  const categoryEntries = product.productCategories.map(
    (entry) => entry.category,
  );
  const displayImages = Array.from(
    new Set(
      [product.image, ...(product.images ?? [])].filter(
        (image): image is string => Boolean(image),
      ),
    ),
  );
  const specifications = Object.entries(product.specifications ?? {});
  const productUrl = await canonicalUrl(
    `/products/${product.slug ?? product.id}`,
  );
  const aggregateRating = await getApprovedRating(tenant.id, product.id);
  const productJsonLd = buildProduct({
    id: product.id,
    name: product.name,
    description: product.description,
    images: product.images?.length
      ? product.images
      : product.image
        ? [product.image]
        : [],
    sku: product.sku,
    brand: product.brand,
    gtin: product.gtin,
    mpn: product.mpn,
    condition: product.condition,
    url: productUrl,
    price: Number(price),
    stockQuantity: product.stockQuantity,
    sellerName: tenant.name,
    aggregateRating,
  });
  const breadcrumbJsonLd = buildBreadcrumbs([
    { name: tenant.name, url: await canonicalUrl("/") },
    { name: "Shop", url: await canonicalUrl("/shop") },
    { name: product.name, url: productUrl },
  ]);

  // Never ship the encrypted Paystack secret to the client.
  const { paystackSecretKey: _paystackSecretKey, ...publicTenant } = tenant;
  const money = (value: number | string) => formatMoney(value, tenant.currency);
  const regularPrice = Number(product.price);
  const salePrice = product.salePrice == null ? null : Number(product.salePrice);
  const onSale = salePrice != null && salePrice >= 0 && salePrice < regularPrice;
  const discountPercent = onSale
    ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
    : 0;
  const storeConfig = tenant.storeConfig;
  const offersDelivery =
    Boolean(tenant.paystackPublicKey) &&
    (storeConfig?.deliveryPricing != null || (storeConfig?.deliveryFee ?? 0) > 0);
  const pickupPlace = tenant.address ?? tenant.location;

  return (
    <ProductPageShell tenant={publicTenant}>
    <main
      id="main-content"
      className="min-h-screen bg-[#f3f0e8] text-stone-950 dark:bg-[#0a1117] dark:text-white"
    >
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <Link
          href="/shop"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg font-bold focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none"
        >
          <ArrowLeft className="h-4 w-4" /> Back to shop
        </Link>
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <ProductGallery images={displayImages} name={product.name} />
          <div className="py-4 lg:py-10">
            <div className="flex flex-wrap gap-2 text-xs font-bold tracking-[0.12em] text-amber-700 uppercase dark:text-amber-400">
              {categoryEntries.length ? (
                categoryEntries.map((category) =>
                  category.slug ? (
                    <Link
                      key={category.id}
                      href={`/categories/${category.slug}`}
                      className="underline decoration-amber-500/60 underline-offset-4"
                    >
                      {category.name}
                    </Link>
                  ) : (
                    <span key={category.id}>{category.name}</span>
                  ),
                )
              ) : (
                <span>Electrical & electronics</span>
              )}
            </div>
            <h1 className="mt-4 text-4xl leading-none font-black tracking-[-0.04em] sm:text-6xl">
              {product.name}
            </h1>
            <div className="mt-6 flex flex-wrap items-baseline gap-3">
              <p className="text-3xl font-black">{money(price)}</p>
              {onSale && (
                <>
                  <p className="text-xl text-stone-500 line-through dark:text-stone-400">
                    <span className="sr-only">Was </span>
                    {money(regularPrice)}
                  </p>
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-sm font-bold text-red-700 dark:bg-red-500/15 dark:text-red-300">
                    -{discountPercent}%
                  </span>
                </>
              )}
            </div>
            <StockBadge
              stockQuantity={product.stockQuantity}
              lowStockThreshold={product.lowStockThreshold ?? undefined}
              className="mt-4"
            />
            <p className="mt-6 text-lg leading-8 text-stone-600 dark:text-stone-300">
              {product.description ??
                "Contact our team for specifications, compatibility and installation guidance."}
            </p>
            {[
              product.brand,
              product.sku,
              product.gtin,
              product.mpn,
              product.warrantyMonths,
              product.conditionNotes,
            ].some(Boolean) && (
              <dl className="mt-8 grid gap-px overflow-hidden border border-stone-300 bg-stone-300 sm:grid-cols-2 dark:border-white/10 dark:bg-white/10">
                {[
                  ["Brand", product.brand],
                  ["SKU", product.sku],
                  ["GTIN", product.gtin],
                  ["MPN", product.mpn],
                  [
                    "Condition",
                    product.condition === "REFURBISHED"
                      ? "Refurbished"
                      : product.condition === "USED"
                        ? "Used"
                        : "New",
                  ],
                  [
                    "Warranty",
                    product.warrantyMonths
                      ? `${product.warrantyMonths} months`
                      : null,
                  ],
                ]
                  .filter((entry) => entry[1])
                  .map(([label, value]) => (
                    <div key={String(label)} className="bg-white p-4 dark:bg-[#0f1a22]">
                      <dt className="text-xs font-bold tracking-wider text-stone-500 uppercase dark:text-stone-400">
                        {label}
                      </dt>
                      <dd className="mt-1 font-bold">{value}</dd>
                    </div>
                  ))}
                {product.conditionNotes && (
                  <div className="bg-white p-4 sm:col-span-2 dark:bg-[#0f1a22]">
                    <dt className="text-xs font-bold tracking-wider text-stone-500 uppercase dark:text-stone-400">
                      Condition notes
                    </dt>
                    <dd className="mt-1 leading-6 text-stone-700 dark:text-stone-300">
                      {product.conditionNotes}
                    </dd>
                  </div>
                )}
              </dl>
            )}
            <ProductBuyBox
              product={{
                id: product.id,
                name: product.name,
                price: Number(price),
                image: product.image,
                stockQuantity: product.stockQuantity,
              }}
            />
            <ul className="mt-8 grid gap-3 sm:grid-cols-3">
              <li>
                <Link
                  href="/find-us"
                  className="block h-full rounded-2xl border border-stone-300 bg-white p-4 transition hover:border-amber-600 focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none dark:border-white/10 dark:bg-white/5"
                >
                  <MapPin className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                  <p className="mt-3 text-sm font-bold">Pick up in store</p>
                  <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                    {pickupPlace ?? "See our location"}
                  </p>
                </Link>
              </li>
              <li className="rounded-2xl border border-stone-300 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <Truck className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                <p className="mt-3 text-sm font-bold">
                  {offersDelivery ? "Delivery available" : "Pickup only"}
                </p>
                <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                  {offersDelivery
                    ? storeConfig?.deliveryPricing?.type === "distance"
                      ? "Fee depends on distance; paid online"
                      : `${money(storeConfig?.deliveryFee ?? 0)} fee, paid online`
                    : "Collect from the store"}
                </p>
              </li>
              <li className="rounded-2xl border border-stone-300 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <Wallet className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                <p className="mt-3 text-sm font-bold">Pay on pickup</p>
                <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                  {tenant.paystackPublicKey
                    ? "Or pay online with Paystack"
                    : "Pay when you collect"}
                </p>
              </li>
            </ul>
            {tenant.phone && (
              <TrackedLink
                href={`https://wa.me/${tenant.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, I need help with ${product.name}`)}`}
                eventName="click_whatsapp"
                className="mt-6 inline-flex min-h-14 items-center gap-3 rounded-full border border-stone-400 px-7 font-black text-stone-800 dark:border-white/30 dark:text-white"
              >
                <PhoneCall className="h-5 w-5" /> Ask about this product
              </TrackedLink>
            )}
          </div>
        </div>
        {specifications.length > 0 && (
          <section className="mt-16 border-t border-stone-300 py-12 dark:border-white/10">
            <p className="text-xs font-black tracking-[0.18em] text-amber-700 uppercase dark:text-amber-400">
              Product details
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">
              Specifications
            </h2>
            <dl className="mt-7 grid gap-px border border-stone-300 bg-stone-300 sm:grid-cols-2 lg:grid-cols-3 dark:border-white/10 dark:bg-white/10">
              {specifications.map(([label, value]) => (
                <div key={label} className="bg-white p-5 dark:bg-[#0f1a22]">
                  <dt className="text-xs font-bold tracking-wider text-stone-500 uppercase dark:text-stone-400">
                    {label}
                  </dt>
                  <dd className="mt-2 font-bold">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        {categoryEntries.some((category) => category.slug) && (
          <section className="border-t border-stone-300 py-12 dark:border-white/10">
            <h2 className="text-2xl font-black">Browse related departments</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {categoryEntries
                .filter(
                  (category): category is typeof category & { slug: string } =>
                    Boolean(category.slug),
                )
                .map((category) => (
                  <Link
                    key={category.id}
                    href={`/categories/${category.slug}`}
                    className="inline-flex min-h-11 items-center border-2 border-stone-800 px-5 font-black hover:bg-white dark:border-white/40 dark:hover:bg-white/10"
                  >
                    More {category.name}
                  </Link>
                ))}
            </div>
          </section>
        )}
      </div>
    </main>
    </ProductPageShell>
  );
}
