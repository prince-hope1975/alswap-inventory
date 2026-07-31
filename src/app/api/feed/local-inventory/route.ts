import { headers } from "next/headers";

import { escapeXml, iterateFeedProducts } from "~/lib/seo/feed";
import { db } from "~/server/db";
import { resolvePublicTenant } from "~/server/tenant";

export const dynamic = "force-dynamic";

/**
 * Local Inventory Ads feed. Paid-only in Nigeria — free local listings are
 * not available here — so this exists as ad infrastructure, not an organic
 * discovery path. `store_code` must match the code Google assigns the
 * location in the linked Business Profile; `tenant.slug` is a placeholder
 * until that mapping exists.
 */
export async function GET() {
  const headerList = new Headers(await headers());
  const tenant = await resolvePublicTenant(db, headerList);
  if (!tenant) return new Response("Not found", { status: 404 });

  const rows: string[] = [];
  for await (const product of iterateFeedProducts(tenant.id)) {
    const availability =
      product.stockQuantity === -1 || product.stockQuantity > 0 ? "in stock" : "out of stock";
    rows.push(
      [
        escapeXml(tenant.slug),
        escapeXml(product.id),
        product.stockQuantity === -1 ? "" : String(product.stockQuantity),
        `${Number(product.price).toFixed(2)} NGN`,
        availability,
      ].join(","),
    );
  }

  const csv = `store_code,id,quantity,price,availability\n${rows.join("\n")}\n`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
