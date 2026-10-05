import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticle } from "../blog-view";
import { getBlogContext } from "../blog-server";
import { blogUrlFromHost } from "~/lib/content/blog";
import { JsonLd } from "~/lib/seo/json-ld";

type Props = { params: Promise<{ slug: string }> };

async function getPage(params: Props["params"]) {
  const context = await getBlogContext();
  const { slug } = await params;
  const post = context.posts.find((item) => item.slug === slug);
  if (!post) notFound();
  return {
    ...context,
    post,
    canonical: blogUrlFromHost(context.host, context.blogSubdomain, post.slug),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { post, canonical } = await getPage(params);
  return {
    title: { absolute: post.seoTitle },
    description: post.description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title: post.title,
      description: post.description,
      url: canonical,
      type: "article",
      siteName: "SPPD AMAKS",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
    },
    twitter: {
      card: "summary",
      title: post.title,
      description: post.description,
      images: [],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { post, posts, links, canonical } = await getPage(params);
  const related = posts
    .filter((p) => p.slug !== post.slug)
    .sort(
      (a, b) =>
        Number(b.category === post.category) -
        Number(a.category === post.category),
    )
    .slice(0, 3);
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.description,
          url: canonical,
          mainEntityOfPage: canonical,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          author: {
            "@type": "Organization",
            name: post.author,
            url: links.home,
          },
          publisher: {
            "@type": "Organization",
            name: "SPPD AMAKS",
            url: links.home,
          },
          isPartOf: {
            "@type": "Blog",
            name: "SPPD AMAKS Blog",
            url: links.blog,
          },
          inLanguage: "en-NG",
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Blog",
              item: links.blog,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: post.title,
              item: canonical,
            },
          ],
        }}
      />
      <BlogArticle post={post} related={related} links={links} />
    </>
  );
}
