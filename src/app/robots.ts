import type { MetadataRoute } from "next";

import { requestBaseUrl } from "~/lib/seo/base-url";

// Reads the request host, so it cannot be statically generated.
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await requestBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        // Longest-match wins, so "/api/feed/" overrides the "/api/" disallow —
        // Merchant Center fetches the product feed directly.
        allow: ["/", "/products/", "/articles/", "/solar", "/api/feed/"],
        disallow: ["/inventory/", "/pos/", "/sales/", "/auth/", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
