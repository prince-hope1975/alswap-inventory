import { and, count, desc, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";

import { canonicalCommerceBaseUrl, requestBaseUrl } from "~/lib/seo/base-url";
import { formatPrice } from "~/lib/seo/commerce-copy";
import { surfaceLabelFromHost } from "~/lib/seo/host";
import { getPublicProfile } from "~/lib/seo/public-profile";
import { db } from "~/server/db";
import { articles, categories, productCategories, products } from "~/server/db/schema";
import { resolvePublicTenant } from "~/server/tenant";
import type { StoreConfig } from "~/types/store-config";

export const dynamic = "force-dynamic";

/** Keeps one line of Markdown from breaking on stray newlines or brackets. */
function inline(text: string) {
  return text.replace(/\s+/g, " ").replace(/[[\]]/g, "").trim();
}

/**
 * /llms.txt: a plain Markdown summary that AI assistants can read in one
 * fetch (https://llmstxt.org). Built from the same tenant, category and
 * article data the pages render, so it never says anything the site doesn't.
 */
export async function GET() {
  const headerList = new Headers(await headers());
  // .txt requests skip the middleware's surface header; read the host directly.
  const surface = surfaceLabelFromHost(headerList.get("x-forwarded-host") ?? headerList.get("host"));
  const tenant = surface === "app" ? null : await resolvePublicTenant(db, headerList);
  if (!tenant) return new Response("Not found", { status: 404 });

  const [surfaceBase, base] = await Promise.all([requestBaseUrl(), canonicalCommerceBaseUrl()]);
  const profile = getPublicProfile(tenant.storeConfig as Partial<StoreConfig> | null);

  const [categoryRows, articleRows] = await Promise.all([
    db
      .select({
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        productCount: count(products.id),
        minPrice: sql<string | null>`min(case when ${products.salePrice} > 0 then ${products.salePrice} when ${products.price} > 0 then ${products.price} end)`,
      })
      .from(categories)
      .leftJoin(productCategories, eq(productCategories.categoryId, categories.id))
      .leftJoin(
        products,
        and(eq(products.id, productCategories.productId), eq(products.visibility, "PUBLISHED")),
      )
      .where(eq(categories.tenantId, tenant.id))
      .groupBy(categories.id)
      .orderBy(desc(count(products.id))),
    db.query.articles.findMany({
      where: and(eq(articles.tenantId, tenant.id), eq(articles.isPublished, true)),
      columns: { title: true, slug: true, excerpt: true },
      orderBy: desc(articles.publishedAt),
      limit: 30,
    }),
  ]);

  const summary =
    profile.businessDescription ??
    `${tenant.name} sells electrical supplies and home appliances${tenant.location ? ` in ${tenant.location}` : ""}.`;

  const facts = [
    tenant.address && `Address: ${inline(tenant.address)}`,
    tenant.location && `Location: ${inline(tenant.location)}`,
    tenant.phone && `Phone: ${inline(tenant.phone)}`,
    profile.serviceAreas.length > 0 && `Areas served: ${profile.serviceAreas.join(", ")}`,
    ...profile.openingHours.map((h) => `Open ${h.days.join(", ")}: ${h.opens}–${h.closes}`),
  ].filter(Boolean);

  const listed = categoryRows.filter((c) => c.slug && c.productCount > 0);

  const lines = [
    `# ${tenant.name}`,
    "",
    `> ${inline(summary)}`,
    "",
    ...facts.map((f) => `- ${f as string}`),
    "",
    "Prices and stock change often. Each product page shows the current price and availability; confirm by phone before travelling.",
    "",
    "## Key pages",
    "",
    `- [Shop](${base}/shop): full catalogue with current prices and stock`,
    `- [Find us](${base}/find-us): address, map and contact details`,
    `- [Solar](${surfaceBase}/solar): solar installation enquiries and a starting-size estimator`,
    `- [Guides](${base}/guides): buying guides and store articles`,
    `- [About](${base}/about): who we are`,
  ];

  if (listed.length) {
    lines.push("", "## Product categories", "");
    for (const c of listed) {
      const min = c.minPrice != null && Number(c.minPrice) > 0 ? Number(c.minPrice) : null;
      const stock = `${c.productCount} ${c.productCount === 1 ? "item" : "items"}${
        min != null ? ` from ${formatPrice(tenant.currency, min)}` : ""
      }`;
      const about = c.description ? `${inline(c.description)} ` : "";
      lines.push(`- [${inline(c.name)}](${base}/categories/${c.slug}): ${about}(${stock})`);
    }
  }

  if (articleRows.length) {
    lines.push("", "## Guides", "");
    for (const a of articleRows) {
      lines.push(`- [${inline(a.title)}](${base}/articles/${a.slug})${a.excerpt ? `: ${inline(a.excerpt)}` : ""}`);
    }
  }

  lines.push("", "## Optional", "", `- [Sitemap](${surfaceBase}/sitemap.xml)`, "");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
