import type { MetadataRoute } from "next";
import posts from "~/content/blog/posts.json";
import {
  commerceBaseUrlFromHost,
  isLocalHost,
  registrableRootFromHost,
  normalizeRequestHost,
  portFromRawHost,
} from "~/lib/seo/host";

export const blogPosts = posts;
export type BlogPost = (typeof blogPosts)[number];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

// This collection belongs to SPPD, not every store using this application.
export function blogPostsForTenant(
  tenant: { customDomain: string | null } | null | undefined,
) {
  return normalizeRequestHost(tenant?.customDomain) === "sppdamaks.com"
    ? blogPosts
    : [];
}

export function blogUrlFromHost(
  rawHost: string,
  subdomain?: string,
  slug?: string,
) {
  const port = portFromRawHost(rawHost);
  const base = subdomain
    ? commerceBaseUrlFromHost(rawHost, subdomain, port)
    : commerceBaseUrlFromHost(
        rawHost,
        isLocalHost(registrableRootFromHost(rawHost)) ? undefined : "www",
        port,
      );
  return `${base}${slug ? `/blog/${slug}` : subdomain ? "/" : "/blog"}`;
}

export function blogSitemap(
  rawHost: string,
  subdomain: string | undefined,
  collection: BlogPost[],
): MetadataRoute.Sitemap {
  if (!collection.length) return [];
  return [
    {
      url: blogUrlFromHost(rawHost, subdomain),
      lastModified: collection[0]!.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...collection.map((post) => ({
      url: blogUrlFromHost(rawHost, subdomain, post.slug),
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
