import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "~/server/db";
import { articles } from "~/server/db/schema";
import { resolvePublicTenant } from "~/server/tenant";

async function getArticle(slug: string) {
  const tenant = await resolvePublicTenant(db, new Headers(await headers()));
  if (!tenant) return null;
  const article = await db.query.articles.findFirst({ where: and(eq(articles.tenantId, tenant.id), eq(articles.slug, slug), eq(articles.isPublished, true)) });
  return article ? { article, tenant } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const result = await getArticle((await params).slug);
  if (!result) return { title: "Article not found" };
  return { title: `${result.article.title} | ${result.tenant.name}`, description: result.article.excerpt, alternates: { canonical: `/articles/${result.article.slug}` }, openGraph: { title: result.article.title, description: result.article.excerpt ?? undefined, images: result.article.coverImage ? [result.article.coverImage] : undefined, type: "article" } };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const result = await getArticle((await params).slug);
  if (!result) notFound();
  const { article, tenant } = result;
  return <main id="main-content" className="min-h-screen bg-[#f7f4ec] px-5 py-12 text-stone-950 sm:px-8"><article className="mx-auto max-w-3xl"><Link href="/" className="font-bold text-amber-800">← {tenant.name}</Link><p className="mt-12 font-mono text-xs uppercase tracking-[0.2em] text-amber-700">Guide · {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString("en-NG") : "Store journal"}</p><h1 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-6xl">{article.title}</h1>{article.excerpt && <p className="mt-6 text-xl leading-8 text-stone-600">{article.excerpt}</p>}{article.coverImage && <img src={article.coverImage} alt="" className="mt-10 aspect-video w-full rounded-3xl object-cover" />}<div className="mt-10 whitespace-pre-wrap text-lg leading-8 text-stone-700">{article.content}</div></article></main>;
}
