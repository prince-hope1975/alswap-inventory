import type { MetadataRoute } from "next";
import { and, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";

import { canonicalCommerceBaseUrl, requestBaseUrl } from "~/lib/seo/base-url";
import { surfaceLabelFromHost } from "~/lib/seo/host";
import { db } from "~/server/db";
import { articles, products } from "~/server/db/schema";
import { resolvePublicTenant } from "~/server/tenant";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headerList = new Headers(await headers());
  // Resolve the tenant the same way every other public path does, so the
  // sitemap describes the store that is actually being served on this host.
  const tenant = await resolvePublicTenant(db, headerList);
  // Read from the host, not x-storefront-surface: sitemap.xml matches
  // publicAssetPatterns and returns before the middleware sets that header.
  const surface = surfaceLabelFromHost(
    headerList.get("x-forwarded-host") ?? headerList.get("host"),
  );
  const [surfaceBase, canonicalBase] = await Promise.all([
    requestBaseUrl(),
    canonicalCommerceBaseUrl(),
  ]);
  // The back office is noindex end to end; it advertises nothing.
  if (surface === "app") return [];
  if (!tenant) return [{ url: surfaceBase, lastModified: new Date() }];

  const [productRows, articleRows] = await Promise.all([
    db.query.products.findMany({
      where: and(
        eq(products.tenantId, tenant.id),
        eq(products.visibility, "PUBLISHED"),
        // used.<root> lists only what it actually sells.
        surface === "used"
          ? inArray(products.condition, ["USED", "REFURBISHED"])
          : undefined,
      ),
      columns: { id: true, slug: true, updatedAt: true },
    }),
    db.query.articles.findMany({
      where: eq(articles.tenantId, tenant.id),
      columns: { slug: true, updatedAt: true, isPublished: true },
    }),
  ]);

  // Solar is lead-gen, not catalogue: it advertises its own landing page and
  // the articles that feed it, and leaves the product URLs to the commerce
  // surface that actually sells them.
  if (surface === "solar") {
    return [
      { url: surfaceBase, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
      ...articleRows
        .filter((article) => article.isPublished)
        .map((article) => ({
          url: `${canonicalBase}/articles/${article.slug}`,
          lastModified: article.updatedAt ?? new Date(),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        })),
    ];
  }

  return [
    { url: surfaceBase, lastModified: tenant.updatedAt ?? tenant.createdAt, changeFrequency: "daily", priority: 1 },
    { url: `${surfaceBase}/shop`, lastModified: tenant.updatedAt ?? tenant.createdAt, changeFrequency: "daily", priority: 0.9 },
    { url: `${surfaceBase}/solar`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    // Detail pages are listed at their canonical commerce host, never at the
    // surface host, so the sitemap never contradicts the page's own canonical.
    //
    // Once COMMERCE_SUBDOMAIN is set these become cross-host entries (e.g.
    // used.<root>/sitemap.xml listing shop.<root>/products/...). That is valid
    // only under a Search Console *Domain* property, which is how this site is
    // registered. Do not "fix" these back to surfaceBase — it would make every
    // sitemap entry contradict the canonical on the page it points at.
    ...productRows.map((product) => ({
      url: `${canonicalBase}/products/${product.slug ?? product.id}`,
      lastModified: product.updatedAt ?? new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...articleRows
      .filter((article) => article.isPublished)
      .map((article) => ({
        url: `${canonicalBase}/articles/${article.slug}`,
        lastModified: article.updatedAt ?? new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
  ];
}
