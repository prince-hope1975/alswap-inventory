import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BlogIndex, BlogArticle } from "./blog-view";
import { blogPosts } from "~/lib/content/blog";

const links = {
  home: "https://www.sppdamaks.com",
  shop: "https://shop.sppdamaks.com",
  contact: "https://shop.sppdamaks.com/find-us",
  blog: "https://www.sppdamaks.com/blog",
};
describe("blog reading experience", () => {
  it("formats each post's own publication date in Nigerian time", () => {
    const post = { ...blogPosts[0]!, publishedAt: "2026-10-06T00:00:00+01:00" };
    const html = renderToStaticMarkup(
      <BlogArticle post={post} related={[]} links={links} />,
    );
    expect(html).toContain("Published 6 October 2026");
  });
  it("renders six crawlable article links and accessible navigation", () => {
    const html = renderToStaticMarkup(
      <BlogIndex posts={blogPosts} links={links} />,
    );
    expect(html).toContain('aria-label="Blog navigation"');
    for (const post of blogPosts) expect(html).toContain(`/blog/${post.slug}`);
    expect(html).toContain("Practical advice.");
  });
  it("renders the complete solar guide, related posts, byline and contact CTA", () => {
    const post = blogPosts[3]!;
    const html = renderToStaticMarkup(
      <BlogArticle post={post} related={blogPosts.slice(0, 2)} links={links} />,
    );
    expect(html).toContain(post.title);
    expect(html).toContain("List the appliances you want to power");
    expect(html).toContain('href="tel:+2348033367124"');
    expect(html).toContain("Related reading");
    expect(html).not.toContain("**08033367124**");
    expect(html).toContain('<time dateTime="2026-10-05');
    expect(html).not.toContain("ARTICLE END");
  });
});
