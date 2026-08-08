import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, MapPin, Phone, Wrench } from "lucide-react";

import { PublicStoreUnavailable } from "~/app/_components/shop/public-store-unavailable";
import { canonicalUrl } from "~/lib/seo/base-url";
import { getPublicProfile } from "~/lib/seo/public-profile";
import type { StoreConfig } from "~/types/store-config";
import { api } from "~/trpc/server";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "About our electrical store",
    description:
      "Learn about our electrical supplies, product guidance, project sourcing and local service.",
    alternates: { canonical: await canonicalUrl("/about") },
  };
}

export default async function AboutPage() {
  const { tenant } = await api.shop.getShopDetails();
  if (!tenant) return <PublicStoreUnavailable />;

  const profile = getPublicProfile(tenant.storeConfig as StoreConfig | null);
  const description =
    profile.businessDescription ??
    `${tenant.name} supplies electrical products for homes, shops, installers and project sites. Customers can get practical guidance before choosing compatible cables, lighting, tools, power protection or solar equipment.`;

  return (
    <main className="min-h-screen bg-[#f5f3ed] text-[#14212b]">
      <header className="border-b border-[#14212b]/20 px-5 py-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5">
          <Link href="/" className="font-black tracking-[-0.02em] uppercase">
            {tenant.name}
          </Link>
          <Link
            href="/shop"
            className="inline-flex min-h-11 items-center gap-2 bg-[#112b3c] px-5 text-sm font-black text-white"
          >
            Shop products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="border-b border-[#14212b]/20">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[1.15fr_0.85fr]">
          <div className="px-5 py-16 sm:py-24 lg:border-r lg:border-[#14212b]/20 lg:px-8">
            <p className="text-xs font-black tracking-[0.18em] text-[#07597d] uppercase">
              Local knowledge. Useful stock.
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl leading-[0.94] font-black tracking-[-0.055em] sm:text-7xl">
              About {tenant.name}
            </h1>
            <p className="mt-8 max-w-3xl text-lg leading-8 text-[#41515c] sm:text-xl">
              {description}
            </p>
          </div>
          <div className="bg-[#112b3c] p-8 text-white sm:p-12">
            <BadgeCheck className="h-10 w-10 text-[#f5a623]" />
            <h2 className="mt-16 text-3xl font-black tracking-[-0.04em]">
              Start with the requirement, then choose the product.
            </h2>
            <p className="mt-5 leading-7 text-white/70">
              Ratings, sizes and compatible parts matter. The store helps
              customers narrow the choice before checkout.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-px bg-[#14212b]/20 sm:grid-cols-3">
        {[
          [
            Wrench,
            "Project sourcing",
            "Share a materials list or bill of quantities for help finding compatible products.",
          ],
          [
            MapPin,
            "Local fulfilment",
            `Pickup and support${tenant.location ? ` around ${tenant.location}` : " from the store"}.`,
          ],
          [
            Phone,
            "Direct product guidance",
            "Ask about ratings, replacements, availability and installation requirements before buying.",
          ],
        ].map(([Icon, title, copy]) => {
          const ItemIcon = Icon as typeof Wrench;
          return (
            <article key={String(title)} className="bg-[#faf9f5] p-8">
              <ItemIcon className="h-7 w-7 text-[#d88700]" />
              <h2 className="mt-8 text-xl font-black">{String(title)}</h2>
              <p className="mt-3 text-sm leading-6 text-[#5c6870]">
                {String(copy)}
              </p>
            </article>
          );
        })}
      </section>

      {(profile.serviceAreas.length > 0 || tenant.address) && (
        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <h2 className="text-3xl font-black tracking-[-0.04em]">
            Where we work
          </h2>
          {profile.serviceAreas.length > 0 && (
            <p className="mt-4 text-[#41515c]">
              Serving {profile.serviceAreas.join(", ")}.
            </p>
          )}
          {tenant.address && (
            <p className="mt-2 text-[#41515c]">Visit: {tenant.address}</p>
          )}
          <Link
            href="/find-us"
            className="mt-8 inline-flex min-h-12 items-center gap-2 border-2 border-[#14212b] px-5 font-black"
          >
            Find the store <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}
    </main>
  );
}
