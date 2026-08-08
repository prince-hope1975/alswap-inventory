import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { StorefrontImage } from "~/app/_components/shop/storefront-image";
import { canonicalUrl } from "~/lib/seo/base-url";
import { db } from "~/server/db";
import { articles } from "~/server/db/schema";
import { resolvePublicTenant } from "~/server/tenant";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Electrical and solar buying guides",
    description:
      "Practical guides for choosing electrical supplies, power protection, cables, solar equipment and compatible replacements.",
    alternates: { canonical: await canonicalUrl("/guides") },
  };
}

export default async function GuidesPage() {
  const tenant = await resolvePublicTenant(db, new Headers(await headers()));
  if (!tenant) return null;
  const published = await db.query.articles.findMany({
    where: and(
      eq(articles.tenantId, tenant.id),
      eq(articles.isPublished, true),
    ),
    orderBy: desc(articles.publishedAt),
  });
  return (
    <main className="min-h-screen bg-[#f5f3ed] text-[#14212b]">
      <header className="border-b border-[#14212b]/20 px-5 py-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="font-black uppercase">
            {tenant.name}
          </Link>
          <Link
            href="/shop"
            className="bg-[#112b3c] px-5 py-3 text-sm font-black text-white"
          >
            Shop products
          </Link>
        </div>
      </header>
      <section className="border-b border-[#14212b]/20 px-5 py-16 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <BookOpen className="h-10 w-10 text-[#d88700]" />
          <p className="mt-10 text-xs font-black tracking-[0.18em] text-[#07597d] uppercase">
            The practical counter
          </p>
          <h1 className="mt-4 max-w-5xl text-5xl leading-[0.94] font-black tracking-[-0.055em] sm:text-7xl">
            Electrical and solar guides for real decisions.
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-[#41515c]">
            Straightforward explanations for comparing products, preparing a
            project list, and knowing when a qualified installer or electrician
            must confirm the final choice.
          </p>
        </div>
      </section>
      {published.length ? (
        <section className="mx-auto grid max-w-7xl gap-px border-x border-[#14212b]/20 bg-[#14212b]/20 sm:grid-cols-2 lg:grid-cols-3">
          {published.map((article) => (
            <article key={article.id} className="bg-[#faf9f5] p-6">
              {article.coverImage && (
                <div className="relative aspect-video overflow-hidden bg-white">
                  <StorefrontImage
                    src={article.coverImage}
                    alt={article.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
              )}
              <p className="mt-6 text-xs font-black tracking-[0.16em] text-[#07597d] uppercase">
                Guide ·{" "}
                {article.publishedAt
                  ? new Date(article.publishedAt).toLocaleDateString("en-NG")
                  : "Store team"}
              </p>
              <h2 className="mt-3 text-2xl leading-tight font-black tracking-[-0.03em]">
                <Link
                  href={`/articles/${article.slug}`}
                  className="hover:text-[#07597d]"
                >
                  {article.title}
                </Link>
              </h2>
              {article.excerpt && (
                <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#5c6870]">
                  {article.excerpt}
                </p>
              )}
              <Link
                href={`/articles/${article.slug}`}
                className="mt-6 inline-flex items-center gap-2 font-black text-[#07597d]"
              >
                Read guide <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="border border-[#14212b]/20 bg-white p-8">
            <h2 className="text-2xl font-black">Guides are being prepared</h2>
            <p className="mt-3 text-[#5c6870]">
              In the meantime, browse products or contact the store for current
              specifications and availability.
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-flex bg-[#112b3c] px-5 py-3 font-black text-white"
            >
              Browse the shop
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
