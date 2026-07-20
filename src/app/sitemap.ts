import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";

import { db } from "~/server/db";
import { articles, products } from "~/server/db/schema";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tenant = await db.query.tenants.findFirst();
  const base = tenant?.customDomain ? `https://${tenant.customDomain}` : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  if (!tenant) return [{ url: base, lastModified: new Date() }];
  const [productRows, articleRows] = await Promise.all([
    db.query.products.findMany({ where: eq(products.tenantId, tenant.id), columns: { id: true, slug: true, updatedAt: true } }),
    db.query.articles.findMany({ where: eq(articles.tenantId, tenant.id), columns: { slug: true, updatedAt: true, isPublished: true } }),
  ]);
  return [
    { url: base, lastModified: tenant.updatedAt ?? tenant.createdAt, changeFrequency: "daily", priority: 1 },
    { url: `${base}/solar`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    ...productRows.map((product) => ({ url: `${base}/products/${product.slug ?? product.id}`, lastModified: product.updatedAt ?? new Date(), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...articleRows.filter((article) => article.isPublished).map((article) => ({ url: `${base}/articles/${article.slug}`, lastModified: article.updatedAt ?? new Date(), changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
