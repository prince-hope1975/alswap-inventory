import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { env } from "~/env";
import { db } from "~/server/db";
import { resolvePublicTenant } from "~/server/tenant";
import { blogPostsForTenant, blogUrlFromHost } from "~/lib/content/blog";
import { commerceBaseUrlFromHost, portFromRawHost } from "~/lib/seo/host";

export const getBlogContext = cache(async () => {
  const h = new Headers(await headers());
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const tenant = await resolvePublicTenant(db, h);
  const posts = blogPostsForTenant(tenant);
  if (!posts.length) notFound();
  const port = portFromRawHost(host);
  const shop = commerceBaseUrlFromHost(host, env.COMMERCE_SUBDOMAIN, port);
  const blogSubdomain = env.BLOG_SUBDOMAIN;
  return {
    posts,
    host,
    blogSubdomain,
    links: {
      home: blogUrlFromHost(host).replace(/\/blog$/, ""),
      shop,
      contact: `${shop}/find-us`,
      blog: blogUrlFromHost(host, blogSubdomain),
    },
  };
});
