import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import {
  blogPosts,
  getBlogPost,
  blogUrlFromHost,
  blogPostsForTenant,
  blogSitemap,
} from "./blog";

describe("owned blog", () => {
  it("publishes all six complete posts with unique slugs and real dates", () => {
    expect(blogPosts).toHaveLength(6);
    expect(new Set(blogPosts.map((p) => p.slug)).size).toBe(6);
    for (const post of blogPosts) {
      expect(post.content.split(/\s+/).length).toBeGreaterThan(400);
      expect(post.content).not.toMatch(
        /ARTICLE START|ARTICLE END|^By SPPD|TODO|draft awaiting/im,
      );
      expect(post.content).toContain("08033367124");
      expect(post.publishedAt).toMatch(/^2026-10-05T/);
      expect(post.minutes).toBeGreaterThan(1);
      expect(getBlogPost(post.slug)).toEqual(post);
    }
    expect(getBlogPost("not-a-post")).toBeUndefined();
  });
  it("never attributes SPPD copy to a different tenant", () => {
    expect(blogPostsForTenant({ customDomain: "sppdamaks.com" })).toHaveLength(
      6,
    );
    expect(blogPostsForTenant({ customDomain: "another-store.com" })).toEqual(
      [],
    );
    expect(blogPostsForTenant(null)).toEqual([]);
  });
  it("canonicalizes to the configured blog host across surfaces", () => {
    expect(blogUrlFromHost("shop.sppdamaks.com")).toBe(
      "https://www.sppdamaks.com/blog",
    );
    expect(blogUrlFromHost("shop.sppdamaks.com", "blog")).toBe(
      "https://blog.sppdamaks.com/",
    );
    expect(blogUrlFromHost("www.sppdamaks.com", "blog", "one")).toBe(
      "https://blog.sppdamaks.com/blog/one",
    );
    expect(blogUrlFromHost("localhost:3000", undefined, "one")).toBe(
      "http://localhost:3000/blog/one",
    );
    expect(blogUrlFromHost("blog.sppdamaks.com", "blog", "one")).toBe(
      "https://blog.sppdamaks.com/blog/one",
    );
  });
  it("lists the canonical index and all six posts in the sitemap", () => {
    const entries = blogSitemap("www.sppdamaks.com", "blog", blogPosts);
    expect(entries).toHaveLength(7);
    expect(entries[0]?.url).toBe("https://blog.sppdamaks.com/");
    for (const post of blogPosts)
      expect(
        entries.find((e) => e.url.endsWith(`/blog/${post.slug}`))?.lastModified,
      ).toBe(post.updatedAt);
  });
  it("wires public routes, source bundle, navigation and crawler discovery", () => {
    expect(readFileSync("src/middleware.ts", "utf8")).toContain('"/blog"');
    expect(readFileSync("src/app/sitemap.ts", "utf8")).toContain("blogSitemap");
    expect(existsSync("src/app/blog/page.tsx")).toBe(true);
    expect(existsSync("src/app/blog/[slug]/page.tsx")).toBe(true);
    expect(
      readFileSync("src/app/_components/home/electrical-home.tsx", "utf8"),
    ).toContain('href="/blog"');
  });
});
