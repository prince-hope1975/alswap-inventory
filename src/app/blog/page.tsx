import type { Metadata } from "next";
import { BlogIndex } from "./blog-view";
import { getBlogContext } from "./blog-server";
import { JsonLd } from "~/lib/seo/json-ld";
import { blogUrlFromHost } from "~/lib/content/blog";

export async function generateMetadata(): Promise<Metadata> {
  const { links } = await getBlogContext();
  const title = "SPPD AMAKS Blog | Electrical, Appliances & Solar Guides";
  const description =
    "Meet SPPD AMAKS in Jeddo, Warri. Read practical guides to electrical shopping, home appliances, delivery and planning your first solar enquiry.";
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: links.blog },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: links.blog,
      type: "website",
      siteName: "SPPD AMAKS",
    },
    twitter: { card: "summary", title, description, images: [] },
  };
}

export default async function BlogPage() {
  const context = await getBlogContext();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "SPPD AMAKS Blog",
          url: context.links.blog,
          publisher: {
            "@type": "Organization",
            name: "SPPD AMAKS",
            url: context.links.home,
          },
          blogPost: context.posts.map((post) => ({
            "@type": "BlogPosting",
            headline: post.title,
            url: blogUrlFromHost(
              context.host,
              context.blogSubdomain,
              post.slug,
            ),
            datePublished: post.publishedAt,
          })),
        }}
      />
      <BlogIndex posts={context.posts} links={context.links} />
    </>
  );
}
