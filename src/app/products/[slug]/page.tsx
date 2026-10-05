import type { Metadata } from "next";
import { and, avg, eq, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  PackageCheck,
  PhoneCall,
  ShieldCheck,
} from "lucide-react";

import { ProductBuyBox } from "~/app/_components/shop/product-buy-box";
import { StorefrontImage } from "~/app/_components/shop/storefront-image";
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
    with: { category: true, productCategories: { with: { category: true } } },
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

  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#f3f0e8] text-stone-950"
    >
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg font-bold focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none"
        >
          <ArrowLeft className="h-4 w-4" /> Back to store
        </Link>
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div>
            <div className="aspect-square overflow-hidden rounded-[2rem] border border-stone-300 bg-white">
              {displayImages[0] ? (
                <div className="relative h-full w-full">
                  <StorefrontImage
                    src={displayImages[0]}
                    alt={product.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                    className="object-contain p-8"
                  />
                </div>
              ) : (
                <div className="grid h-full place-items-center text-stone-400">
                  Product image coming soon
                </div>
              )}
            </div>
            {displayImages.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {displayImages.slice(1, 5).map((image, index) => (
                  <div
                    key={image}
                    className="relative aspect-square overflow-hidden border border-stone-300 bg-white"
                  >
                    <StorefrontImage
                      src={image}
                      alt={`${product.name} view ${index + 2}`}
                      fill
                      sizes="12vw"
                      className="object-contain p-2"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="py-4 lg:py-10">
            <div className="flex flex-wrap gap-2 text-xs font-bold tracking-[0.12em] text-amber-700 uppercase">
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
            <p className="mt-6 text-3xl font-black">
              {tenant.currency ?? "₦"}
              {Number(price).toLocaleString("en-NG")}
            </p>
            <p className="mt-6 text-lg leading-8 text-stone-600">
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
              <dl className="mt-8 grid gap-px overflow-hidden border border-stone-300 bg-stone-300 sm:grid-cols-2">
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
                    <div key={String(label)} className="bg-white p-4">
                      <dt className="text-xs font-bold tracking-wider text-stone-500 uppercase">
                        {label}
                      </dt>
                      <dd className="mt-1 font-bold">{value}</dd>
                    </div>
                  ))}
                {product.conditionNotes && (
                  <div className="bg-white p-4 sm:col-span-2">
                    <dt className="text-xs font-bold tracking-wider text-stone-500 uppercase">
                      Condition notes
                    </dt>
                    <dd className="mt-1 leading-6 text-stone-700">
                      {product.conditionNotes}
                    </dd>
                  </div>
                )}
              </dl>
            )}
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                [
                  PackageCheck,
                  product.stockQuantity > 0 ? "In stock" : "Confirm stock",
                ],
                [ShieldCheck, "Store support"],
                [BadgeCheck, "Current listing"],
              ].map(([Icon, label]) => {
                const ItemIcon = Icon as typeof PackageCheck;
                return (
                  <div
                    key={String(label)}
                    className="rounded-2xl border border-stone-300 bg-white p-4"
                  >
                    <ItemIcon className="h-5 w-5 text-amber-700" />
                    <p className="mt-3 text-sm font-bold">{String(label)}</p>
                  </div>
                );
              })}
            </div>
            <ProductBuyBox
              product={{
                id: product.id,
                name: product.name,
                price: Number(price),
                image: product.image,
                stockQuantity: product.stockQuantity,
              }}
            />
            {tenant.phone && (
              <TrackedLink
                href={`https://wa.me/${tenant.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, I need help with ${product.name}`)}`}
                eventName="click_whatsapp"
                className="mt-6 inline-flex min-h-14 items-center gap-3 rounded-full border border-stone-400 px-7 font-black text-stone-800"
              >
                <PhoneCall className="h-5 w-5" /> Ask about this product
              </TrackedLink>
            )}
          </div>
        </div>
        {specifications.length > 0 && (
          <section className="mt-16 border-t border-stone-300 py-12">
            <p className="text-xs font-black tracking-[0.18em] text-amber-700 uppercase">
              Product details
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">
              Specifications
            </h2>
            <dl className="mt-7 grid gap-px border border-stone-300 bg-stone-300 sm:grid-cols-2 lg:grid-cols-3">
              {specifications.map(([label, value]) => (
                <div key={label} className="bg-white p-5">
                  <dt className="text-xs font-bold tracking-wider text-stone-500 uppercase">
                    {label}
                  </dt>
                  <dd className="mt-2 font-bold">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        {categoryEntries.some((category) => category.slug) && (
          <section className="border-t border-stone-300 py-12">
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
                    className="inline-flex min-h-11 items-center border-2 border-stone-800 px-5 font-black hover:bg-white"
                  >
                    More {category.name}
                  </Link>
                ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
