import { headers } from "next/headers";

import { canonicalCommerceBaseUrl } from "~/lib/seo/base-url";
import { escapeXml, feedCondition, iterateFeedProducts, type FeedProduct } from "~/lib/seo/feed";
import { db } from "~/server/db";
import { resolvePublicTenant } from "~/server/tenant";

export const dynamic = "force-dynamic";

/**
 * Solar carries no stock and is excluded at the source (`feedEligible=false`
 * on every solar-category product) rather than filtered here, so this route
 * has no solar-specific branch to keep in sync as categories change.
 */
function itemXml(product: FeedProduct, link: string) {
  const availability =
    product.stockQuantity === -1 || product.stockQuantity > 0 ? "in_stock" : "out_of_stock";
  const price = Number(product.price).toFixed(2);
  const salePrice =
    product.salePrice != null && Number(product.salePrice) >= 0
      ? Number(product.salePrice).toFixed(2)
      : null;
  const images = [product.image, ...(product.images ?? [])].filter(
    (src): src is string => !!src,
  );
  const [primaryImage, ...extraImages] = images;
  const identifierExists = Boolean(product.gtin ?? product.mpn);

  return `  <item>
    <g:id>${escapeXml(product.id)}</g:id>
    <title>${escapeXml(product.name)}</title>
    <description>${escapeXml(product.description ?? product.name)}</description>
    <link>${escapeXml(link)}</link>
    <g:image_link>${escapeXml(primaryImage!)}</g:image_link>
${extraImages
  .slice(0, 10)
  .map((src) => `    <g:additional_image_link>${escapeXml(src)}</g:additional_image_link>`)
  .join("\n")}
    <g:availability>${availability}</g:availability>
    <g:price>${price} NGN</g:price>
${salePrice ? `    <g:sale_price>${salePrice} NGN</g:sale_price>\n` : ""}    <g:condition>${feedCondition(product.condition)}</g:condition>
${product.brand ? `    <g:brand>${escapeXml(product.brand)}</g:brand>\n` : ""}${
    product.gtin ? `    <g:gtin>${escapeXml(product.gtin)}</g:gtin>\n` : ""
  }${product.mpn ? `    <g:mpn>${escapeXml(product.mpn)}</g:mpn>\n` : ""}${
    !identifierExists ? `    <g:identifier_exists>no</g:identifier_exists>\n` : ""
  }${
    product.googleProductCategory
      ? `    <g:google_product_category>${escapeXml(product.googleProductCategory)}</g:google_product_category>\n`
      : ""
  }  </item>`;
}

export async function GET() {
  const headerList = new Headers(await headers());
  const tenant = await resolvePublicTenant(db, headerList);
  if (!tenant) return new Response("Not found", { status: 404 });

  const base = await canonicalCommerceBaseUrl();

  const items: string[] = [];
  for await (const product of iterateFeedProducts(tenant.id)) {
    const link = `${base}/products/${product.slug ?? product.id}`;
    items.push(itemXml(product, link));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>${escapeXml(tenant.name)}</title>
    <link>${escapeXml(base)}</link>
    <description>${escapeXml(tenant.name)} product feed</description>
${items.join("\n")}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
