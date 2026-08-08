import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleContent } from "~/app/_components/articles/article-content";
import { StorefrontImage } from "~/app/_components/shop/storefront-image";
import { canonicalUrl } from "~/lib/seo/base-url";
import { buildArticle, buildBreadcrumbs } from "~/lib/seo/builders";
import { JsonLd } from "~/lib/seo/json-ld";
import { db } from "~/server/db";
import { articles } from "~/server/db/schema";
import { resolvePublicTenant } from "~/server/tenant";

async function getArticle(slug: string) {
  const tenant = await resolvePublicTenant(db, new Headers(await headers()));
  if (!tenant) return null;
  const article = await db.query.articles.findFirst({
    where: and(
      eq(articles.tenantId, tenant.id),
      eq(articles.slug, slug),
      eq(articles.isPublished, true),
    ),
  });
  return article ? { article, tenant } : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const result = await getArticle((await params).slug);
  if (!result) return { title: "Article not found" };
  const canonical = await canonicalUrl(`/articles/${result.article.slug}`);
  return {
    title: result.article.title,
    description: result.article.excerpt,
    alternates: { canonical },
    openGraph: {
      title: result.article.title,
      description: result.article.excerpt ?? undefined,
      url: canonical,
      images: result.article.coverImage
        ? [result.article.coverImage]
        : undefined,
      type: "article",
    },
    twitter: {
      card: result.article.coverImage ? "summary_large_image" : "summary",
      title: result.article.title,
      description: result.article.excerpt ?? undefined,
      images: result.article.coverImage
        ? [result.article.coverImage]
        : undefined,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const result = await getArticle((await params).slug);
  if (!result) notFound();
  const { article, tenant } = result;
  const articleUrl = await canonicalUrl(`/articles/${article.slug}`);
  const articleJsonLd = buildArticle({
    headline: article.title,
    description: article.excerpt,
    image: article.coverImage,
    url: articleUrl,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    authorName: article.authorName,
    publisherName: tenant.name,
    publisherUrl: await canonicalUrl("/"),
  });
  const breadcrumbJsonLd = buildBreadcrumbs([
    { name: tenant.name, url: await canonicalUrl("/") },
    { name: "Guides", url: await canonicalUrl("/guides") },
    { name: article.title, url: articleUrl },
  ]);
  const authorName = [article.authorName?.trim(), `${tenant.name} team`].find(
    Boolean,
  );

  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#f5f3ed] px-5 py-12 text-[#14212b] sm:px-8"
    >
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <article className="mx-auto max-w-3xl">
        <Link href="/guides" className="font-black text-[#07597d]">
          ← All guides
        </Link>
        <p className="mt-12 text-xs font-black tracking-[0.2em] text-[#07597d] uppercase">
          Practical guide ·{" "}
          {article.publishedAt
            ? new Date(article.publishedAt).toLocaleDateString("en-NG")
            : "Store journal"}
        </p>
        <h1 className="mt-4 text-4xl leading-[0.98] font-black tracking-[-0.05em] sm:text-6xl">
          {article.title}
        </h1>
        {article.excerpt && (
          <p className="mt-6 border-l-4 border-[#f5a623] pl-5 text-xl leading-8 text-[#41515c]">
            {article.excerpt}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-[#5c6870]">
          <span>By {authorName}</span>
          <span>
            Updated{" "}
            {new Date(
              article.updatedAt ?? article.publishedAt ?? article.createdAt,
            ).toLocaleDateString("en-NG")}
          </span>
        </div>
        {article.coverImage && (
          <div className="relative mt-10 aspect-video w-full overflow-hidden border border-[#14212b]/20">
            <StorefrontImage
              src={article.coverImage}
              alt={article.title}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              priority
              className="object-cover"
            />
          </div>
        )}
        <div className="mt-12">
          <ArticleContent content={article.content ?? ""} />
        </div>
        <aside className="mt-16 border-t border-[#14212b]/20 pt-8">
          <h2 className="text-2xl font-black">Need help choosing?</h2>
          <p className="mt-3 leading-7 text-[#5c6870]">
            Check current products or contact {tenant.name} when ratings,
            compatibility or availability need confirmation.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/shop"
              className="inline-flex min-h-11 items-center bg-[#112b3c] px-5 font-black text-white"
            >
              Shop products
            </Link>
            <Link
              href="/find-us"
              className="inline-flex min-h-11 items-center border-2 border-[#14212b] px-5 font-black"
            >
              Contact the store
            </Link>
          </div>
        </aside>
      </article>
    </main>
  );
}
