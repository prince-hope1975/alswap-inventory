import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buildArticle, buildBreadcrumbs } from "~/lib/seo/builders";
import { StorefrontImage } from "~/app/_components/shop/storefront-image";
import { JsonLd } from "~/lib/seo/json-ld";
import { canonicalUrl } from "~/lib/seo/base-url";
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
  // The store name is appended by the root layout's title template.
  return {
    title: result.article.title,
    description: result.article.excerpt,
    alternates: { canonical },
    openGraph: {
      title: result.article.title,
      description: result.article.excerpt ?? undefined,
      images: result.article.coverImage
        ? [result.article.coverImage]
        : undefined,
      type: "article",
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
    authorName: article.authorName,
    publisherName: tenant.name,
  });
  const breadcrumbJsonLd = buildBreadcrumbs([
    { name: tenant.name, url: await canonicalUrl("/") },
    { name: article.title, url: articleUrl },
  ]);
  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#f7f4ec] px-5 py-12 text-stone-950 sm:px-8"
    >
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="font-bold text-amber-800">
          ← {tenant.name}
        </Link>
        <p className="mt-12 font-mono text-xs tracking-[0.2em] text-amber-700 uppercase">
          Guide ·{" "}
          {article.publishedAt
            ? new Date(article.publishedAt).toLocaleDateString("en-NG")
            : "Store journal"}
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-6xl">
          {article.title}
        </h1>
        {article.excerpt && (
          <p className="mt-6 text-xl leading-8 text-stone-600">
            {article.excerpt}
          </p>
        )}
        {article.coverImage && (
          <div className="relative mt-10 aspect-video w-full overflow-hidden rounded-3xl">
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
        <div className="mt-10 text-lg leading-8 whitespace-pre-wrap text-stone-700">
          {article.content}
        </div>
      </article>
    </main>
  );
}
