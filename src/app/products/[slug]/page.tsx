import type { Metadata } from "next";
import { and, eq, or } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, PackageCheck, PhoneCall, ShieldCheck } from "lucide-react";

import { db } from "~/server/db";
import { products } from "~/server/db/schema";
import { resolvePublicTenant } from "~/server/tenant";

async function getProduct(slug: string) {
  const tenant = await resolvePublicTenant(db, new Headers(await headers()));
  if (!tenant) return null;
  const product = await db.query.products.findFirst({
    where: and(eq(products.tenantId, tenant.id), or(eq(products.slug, slug), eq(products.id, slug))),
    with: { category: true, productCategories: { with: { category: true } } },
  });
  return product ? { tenant, product } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProduct(slug);
  if (!result) return { title: "Product not found" };
  const { product, tenant } = result;
  const title = `${product.name} | ${tenant.name}`;
  const description = product.description?.slice(0, 155) ?? `Buy ${product.name} from ${tenant.name}. Check availability, pricing and delivery options.`;
  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug ?? product.id}` },
    openGraph: { title, description, images: product.image ? [product.image] : undefined, type: "website" },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getProduct(slug);
  if (!result) notFound();
  const { tenant, product } = result;
  const price = product.salePrice ?? product.price;
  const categories = product.productCategories.map((entry) => entry.category.name);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images?.length ? product.images : product.image ? [product.image] : undefined,
    sku: product.sku,
    offers: {
      "@type": "Offer",
      priceCurrency: "NGN",
      price: Number(price),
      availability: product.stockQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: tenant.name },
    },
  };

  return (
    <main id="main-content" className="min-h-screen bg-[#f3f0e8] text-stone-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"><ArrowLeft className="h-4 w-4" /> Back to store</Link>
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div className="aspect-square overflow-hidden rounded-[2rem] border border-stone-300 bg-white">
            {product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-contain p-8" /> : <div className="grid h-full place-items-center text-stone-400">Product image coming soon</div>}
          </div>
          <div className="py-4 lg:py-10">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-amber-700">{categories.join(" · ") || "Electrical & electronics"}</p>
            <h1 className="mt-4 text-4xl font-black leading-none tracking-[-0.04em] sm:text-6xl">{product.name}</h1>
            <p className="mt-6 text-3xl font-black">{tenant.currency ?? "₦"}{Number(price).toLocaleString("en-NG")}</p>
            <p className="mt-6 text-lg leading-8 text-stone-600">{product.description ?? "Contact our team for specifications, compatibility and installation guidance."}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[[PackageCheck, product.stockQuantity > 0 ? "In stock" : "Confirm stock"], [ShieldCheck, "Store support"], [BadgeCheck, "Verified listing"]].map(([Icon, label]) => { const ItemIcon = Icon as typeof PackageCheck; return <div key={String(label)} className="rounded-2xl border border-stone-300 bg-white p-4"><ItemIcon className="h-5 w-5 text-amber-700" /><p className="mt-3 text-sm font-bold">{String(label)}</p></div>; })}
            </div>
            {tenant.phone && <a href={`https://wa.me/${tenant.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, I need help with ${product.name}`)}`} className="mt-8 inline-flex min-h-14 items-center gap-3 rounded-full bg-stone-950 px-7 font-black text-white"><PhoneCall className="h-5 w-5" /> Ask about this product</a>}
          </div>
        </div>
      </div>
    </main>
  );
}
