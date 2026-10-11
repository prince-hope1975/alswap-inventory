import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MapPin, Phone, Clock, Truck } from "lucide-react";

import { FindUsMap } from "~/app/_components/find-us/find-us-map";
import { PublicStoreUnavailable } from "~/app/_components/shop/public-store-unavailable";
import { buildLocalBusiness } from "~/lib/seo/builders";
import { JsonLd } from "~/lib/seo/json-ld";
import { canonicalUrl, requestHost } from "~/lib/seo/base-url";
import { getSocialLanding } from "~/lib/seo/social-metadata";
import { api } from "~/trpc/server";
import { getPublicProfile } from "~/lib/seo/public-profile";
import type { StoreConfig } from "~/types/store-config";

export async function generateMetadata(): Promise<Metadata> {
  const canonical = await canonicalUrl("/find-us");
  return {
    title: "Find us",
    description: "Store location, pickup point and directions.",
    alternates: { canonical },
  };
}

export default async function FindUsPage() {
  const { tenant } = await api.shop.getShopDetails();
  if (!tenant) return <PublicStoreUnavailable />;

  const lat = tenant.latitude ? Number(tenant.latitude) : undefined;
  const lng = tenant.longitude ? Number(tenant.longitude) : undefined;
  // (0, 0) is "null island" in the Gulf of Guinea, not a real pickup point —
  // it's what an unset lat/lng looks like once coerced through `Number()`,
  // and publishing it as LocalBusiness geo would misinform Google Maps.
  const hasCoords =
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0);
  const config = tenant.storeConfig as StoreConfig | null;
  const profile = getPublicProfile(config);

  const landing = getSocialLanding(await requestHost(), "home");
  const localBusinessJsonLd = buildLocalBusiness({
    name: landing.siteName ?? tenant.name,
    alternateNames: landing.alternateNames,
    url: await canonicalUrl("/find-us"),
    image: tenant.logo,
    phone: tenant.phone,
    address: tenant.address,
    locality: tenant.location,
    latitude: hasCoords ? lat : null,
    longitude: hasCoords ? lng : null,
    serviceAreas: profile.serviceAreas,
    openingHours: profile.openingHours,
    sameAs: profile.socialProfiles,
  });

  return (
    <main className="min-h-screen bg-[#f6f4ee] text-[#14212b] dark:bg-[#101d27] dark:text-white">
      <JsonLd data={localBusinessJsonLd} />
      <header className="border-b border-[#14212b]/10 dark:border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
          <Link href="/shop" className="text-lg font-bold tracking-tight">
            {tenant.name}
          </Link>
          <Link
            href="/shop"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-[#0b6e99]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Shop
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-10 sm:py-16">
        <p className="text-xs font-bold tracking-[0.2em] text-[#0b6e99] uppercase dark:text-[#8dc5dc]">
          Visit the store
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">
          Find us. Pick up. Get to work.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-[#53636d] dark:text-gray-300">
          Visit {tenant.name} for supplies and advice, or collect your online
          order. Use the map below to plan your trip.
        </p>
        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[0.8fr_1.6fr]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-[#14212b]/10 bg-white p-6 dark:border-white/10 dark:bg-white/5">
              <MapPin
                className="mb-4 h-6 w-6 text-[#0b6e99] dark:text-[#8dc5dc]"
                aria-hidden
              />
              <h2 className="text-lg font-bold">Our pickup point</h2>
              <p className="mt-2 leading-7 text-[#53636d] dark:text-gray-300">
                {tenant.address ??
                  tenant.location ??
                  "Use the map for our store location."}
              </p>
              {tenant.phone && (
                <a
                  href={`tel:${tenant.phone.replace(/[^+0-9]/g, "")}`}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-[#0b6e99] dark:text-[#8dc5dc]"
                >
                  <Phone className="h-4 w-4" />
                  {tenant.phone}
                </a>
              )}
            </section>
            {profile.openingHours.length > 0 && (
              <section className="rounded-2xl border border-[#14212b]/10 bg-white p-6 dark:border-white/10 dark:bg-white/5">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <Clock className="h-5 w-5" />
                  Opening hours
                </h2>
                {profile.openingHours.map((hours) => (
                  <p
                    key={`${hours.days.join("-")}-${hours.opens}`}
                    className="mt-3 text-sm leading-7 text-[#53636d] dark:text-gray-300"
                  >
                    {hours.days.join(", ")}
                    <br />
                    {hours.opens}–{hours.closes}
                  </p>
                ))}
              </section>
            )}
            {profile.serviceAreas.length > 0 && (
              <section className="rounded-2xl border border-[#14212b]/10 bg-white p-6 dark:border-white/10 dark:bg-white/5">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <Truck className="h-5 w-5" />
                  Service areas
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#53636d] dark:text-gray-300">
                  {profile.serviceAreas.join(", ")}
                </p>
              </section>
            )}
          </div>
          {hasCoords ? (
            <FindUsMap
              lat={lat}
              lng={lng}
              address={tenant.address ?? undefined}
              googleMapsUrl={config?.googleMapsUrl}
            />
          ) : (
            <div className="rounded-2xl border border-[#14212b]/10 bg-white p-6 dark:border-white/10 dark:bg-white/5">
              Please contact the store for directions.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
