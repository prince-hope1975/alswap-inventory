import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { requestBaseUrl } from "~/lib/seo/base-url";
import { surfaceLabelFromHost } from "~/lib/seo/host";

// Reads the request host, so it cannot be statically generated.
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headerList = await headers();
  // Read the surface from the host rather than the x-storefront-surface header:
  // robots.txt matches publicAssetPatterns and returns before the middleware
  // sets that header, so it would always be absent here.
  const surface = surfaceLabelFromHost(
    headerList.get("x-forwarded-host") ?? headerList.get("host"),
  );
  const base = await requestBaseUrl();

  // The back office is not a public surface. No sitemap either — pointing
  // crawlers at one while disallowing everything is a mixed signal.
  if (surface === "app") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  if (surface === "solar") {
    return {
      rules: [
        {
          userAgent: "*",
          allow: ["/solar", "/articles/"],
          disallow: ["/inventory/", "/pos/", "/sales/", "/auth/", "/api/"],
        },
      ],
      sitemap: `${base}/sitemap.xml`,
    };
  }

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
