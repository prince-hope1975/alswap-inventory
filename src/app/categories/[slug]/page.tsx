import type { Metadata } from "next";
import { and, count, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { StorefrontImage } from "~/app/_components/shop/storefront-image";
import { buildBreadcrumbs, buildCollectionPage } from "~/lib/seo/builders";
import { canonicalUrl } from "~/lib/seo/base-url";
import { JsonLd } from "~/lib/seo/json-ld";
import { db } from "~/server/db";
import { categories, productCategories, products } from "~/server/db/schema";
import { resolvePublicTenant } from "~/server/tenant";

const PAGE_SIZE = 24;

async function getCategory(slug: string) {
  const tenant = await resolvePublicTenant(db, new Headers(await headers()));
  if (!tenant) return null;
  const category = await db.query.categories.findFirst({
    where: and(eq(categories.tenantId, tenant.id), eq(categories.slug, slug)),
  });
  return category ? { tenant, category } : null;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCategory(slug);
  if (!result) return { title: "Category not found" };
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const path = `/categories/${slug}${page > 1 ? `?page=${page}` : ""}`;
  const location = result.tenant.location
    ? ` in ${result.tenant.location}`
    : "";
  return {
    title: `${result.category.name}${location}`,
    description:
      result.category.description ??
      `Browse ${result.category.name.toLowerCase()} available from ${result.tenant.name}. Check current prices, stock and pickup or delivery options.`,
    alternates: { canonical: await canonicalUrl(path) },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const result = await getCategory(slug);
  if (!result) notFound();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      description: products.description,
      image: products.image,
      price: products.price,
      salePrice: products.salePrice,
      stockQuantity: products.stockQuantity,
    })
    .from(productCategories)
    .innerJoin(products, eq(products.id, productCategories.productId))
    .where(
      and(
        eq(productCategories.categoryId, result.category.id),
        eq(products.tenantId, result.tenant.id),
        eq(products.visibility, "PUBLISHED"),
      ),
    )
    .limit(PAGE_SIZE)
    .offset(offset);
  const [totalRow] = await db
    .select({ value: count() })
    .from(productCategories)
    .innerJoin(products, eq(products.id, productCategories.productId))
    .where(
      and(
        eq(productCategories.categoryId, result.category.id),
        eq(products.tenantId, result.tenant.id),
        eq(products.visibility, "PUBLISHED"),
      ),
    );
  const total = totalRow?.value ?? 0;
  if (page > 1 && offset >= total) notFound();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const categoryUrl = await canonicalUrl(
    `/categories/${slug}${page > 1 ? `?page=${page}` : ""}`,
  );
  const productsForSchema = await Promise.all(
    rows.map(async (product) => ({
      name: product.name,
      url: await canonicalUrl(`/products/${product.slug}`),
      image: product.image,
    })),
  );

  return (
    <main className="min-h-screen bg-[#f5f3ed] text-[#14212b]">
      <JsonLd
        data={buildCollectionPage({
          name: result.category.name,
          description: result.category.description,
          url: categoryUrl,
          products: productsForSchema,
        })}
      />
      <JsonLd
        data={buildBreadcrumbs([
          { name: result.tenant.name, url: await canonicalUrl("/") },
          { name: "Shop", url: await canonicalUrl("/shop") },
          { name: result.category.name, url: categoryUrl },
        ])}
      />
      <header className="border-b border-[#14212b]/20 px-5 py-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/shop"
            className="inline-flex min-h-11 items-center gap-2 font-black"
          >
            <ArrowLeft className="h-4 w-4" /> All departments
          </Link>
        </div>
      </header>
      <section className="border-b border-[#14212b]/20 px-5 py-14 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-black tracking-[0.18em] text-[#07597d] uppercase">
            Product department
          </p>
          <h1 className="mt-4 text-5xl font-black tracking-[-0.055em] sm:text-7xl">
            {result.category.name}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[#41515c]">
            {result.category.description ??
              `Browse ${result.category.name.toLowerCase()} with current pricing and availability from ${result.tenant.name}. Contact the store when compatibility or ratings need confirmation.`}
          </p>
          <p className="mt-4 text-sm font-bold text-[#5c6870]">
            {total} {total === 1 ? "product" : "products"}
          </p>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-px border-x border-[#14212b]/20 bg-[#14212b]/20 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((product) => {
          const price = Number(product.salePrice ?? product.price);
          return (
            <article key={product.id} className="bg-[#faf9f5] p-5">
              <Link href={`/products/${product.slug}`} className="group block">
                <div className="relative aspect-square overflow-hidden bg-white">
                  {product.image ? (
                    <StorefrontImage
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 25vw"
                      className="object-contain p-5 transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <span className="grid h-full place-items-center text-sm text-[#7b858c]">
                      Image coming soon
                    </span>
                  )}
                </div>
                <h2 className="mt-5 text-lg leading-tight font-black">
                  {product.name}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#5c6870]">
                  {product.description ??
                    "Ask the store for specifications and compatibility guidance."}
                </p>
                <p className="mt-4 font-black">
                  {result.tenant.currency ?? "₦"}
                  {price.toLocaleString("en-NG")}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#07597d]">
                  View product <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </article>
          );
        })}
      </section>
      {totalPages > 1 && (
        <nav
          aria-label="Category pages"
          className="mx-auto flex max-w-7xl items-center justify-between px-5 py-10 lg:px-8"
        >
          <span>
            {page > 1 ? (
              <Link
                href={`/categories/${slug}${page > 2 ? `?page=${page - 1}` : ""}`}
                className="font-black"
              >
                ← Previous
              </Link>
            ) : null}
          </span>
          <span className="text-sm font-bold">
            Page {page} of {totalPages}
          </span>
          <span>
            {page < totalPages ? (
              <Link
                href={`/categories/${slug}?page=${page + 1}`}
                className="font-black"
              >
                Next →
              </Link>
            ) : null}
          </span>
        </nav>
      )}
    </main>
  );
}
