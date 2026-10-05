import type { MetadataRoute } from "next";
import { and, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";

import { canonicalCommerceBaseUrl, requestBaseUrl } from "~/lib/seo/base-url";
import { homeBaseUrlFromHost, surfaceLabelFromHost } from "~/lib/seo/host";
import { blogPostsForTenant, blogSitemap } from "~/lib/content/blog";
import { env } from "~/env";
import { db } from "~/server/db";
import { articles, categories, products } from "~/server/db/schema";
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
  const homeBase = homeBaseUrlFromHost(
    headerList.get("x-forwarded-host") ?? headerList.get("host"),
  );
  const [surfaceBase, canonicalBase] = await Promise.all([
    requestBaseUrl(),
    canonicalCommerceBaseUrl(),
  ]);
  // The back office is noindex end to end; it advertises nothing.
  if (surface === "app") return [];
  if (!tenant) return [{ url: surfaceBase, lastModified: new Date() }];

  const blogEntries = blogSitemap(
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "",
    env.BLOG_SUBDOMAIN,
    blogPostsForTenant(tenant),
  );
  if (surface === "blog") return blogEntries;

  const [productRows, articleRows, categoryRows] = await Promise.all([
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
    db.query.categories.findMany({
      where: eq(categories.tenantId, tenant.id),
      columns: { slug: true },
    }),
  ]);

  // Solar is lead-gen, not catalogue: it advertises its own landing page and
  // the articles that feed it, and leaves the product URLs to the commerce
  // surface that actually sells them.
  if (surface === "solar") {
    return [
      {
        url: surfaceBase,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 1,
      },
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
    ...blogEntries,
    {
      url: surfaceBase,
      lastModified: tenant.updatedAt ?? tenant.createdAt,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${surfaceBase}/shop`,
      lastModified: tenant.updatedAt ?? tenant.createdAt,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${surfaceBase}/solar`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${canonicalBase}/guides`,
      lastModified:
        articleRows[0]?.updatedAt ?? tenant.updatedAt ?? tenant.createdAt,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    // Brand-name page: names the business and its alternate spellings. Its
    // canonical is the home host (`canonicalHomeUrl("/about")`), not commerce.
    {
      url: `${homeBase}/about`,
      lastModified: tenant.updatedAt ?? tenant.createdAt,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // Carries LocalBusiness JSON-LD, so it ties the site to the Business
    // Profile. Listed at the commerce host because that is what
    // its own canonical resolves to (`canonicalUrl("/find-us")`).
    {
      url: `${canonicalBase}/find-us`,
      lastModified: tenant.updatedAt ?? tenant.createdAt,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...categoryRows
      .filter((category): category is typeof category & { slug: string } =>
        Boolean(category.slug),
      )
      .map((category) => ({
        url: `${canonicalBase}/categories/${category.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.75,
      })),
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
