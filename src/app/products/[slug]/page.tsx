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
import { db } from "~/server/db";
import { products, reviews } from "~/server/db/schema";
import { resolvePublicTenant } from "~/server/tenant";

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
  // The store name is appended by the root layout's title template.
  const title = product.name;
  const description =
    product.description?.slice(0, 155) ??
    `Buy ${product.name} from ${tenant.name}. Check availability, pricing and delivery options.`;
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
      images: product.image ? [product.image] : undefined,
      type: "website",
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
  const categories = product.productCategories.map(
    (entry) => entry.category.name,
  );
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
          <div className="aspect-square overflow-hidden rounded-[2rem] border border-stone-300 bg-white">
            {product.image ? (
              <div className="relative h-full w-full">
                <StorefrontImage
                  src={product.image}
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
          <div className="py-4 lg:py-10">
            <p className="font-mono text-xs font-bold tracking-[0.2em] text-amber-700 uppercase">
              {categories.join(" · ") || "Electrical & electronics"}
            </p>
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
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                [
                  PackageCheck,
                  product.stockQuantity > 0 ? "In stock" : "Confirm stock",
                ],
                [ShieldCheck, "Store support"],
                [BadgeCheck, "Verified listing"],
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
              <a
                href={`https://wa.me/${tenant.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, I need help with ${product.name}`)}`}
                className="mt-6 inline-flex min-h-14 items-center gap-3 rounded-full border border-stone-400 px-7 font-black text-stone-800"
              >
                <PhoneCall className="h-5 w-5" /> Ask about this product
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
