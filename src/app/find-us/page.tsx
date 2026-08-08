import type { Metadata } from "next";
import Link from "next/link";

import { FindUsMap } from "~/app/_components/find-us/find-us-map";
import { PublicStoreUnavailable } from "~/app/_components/shop/public-store-unavailable";
import { buildLocalBusiness } from "~/lib/seo/builders";
import { JsonLd } from "~/lib/seo/json-ld";
import { canonicalUrl } from "~/lib/seo/base-url";
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
  const profile = getPublicProfile(tenant.storeConfig as StoreConfig | null);

  const localBusinessJsonLd = buildLocalBusiness({
    name: tenant.name,
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
    <main className="min-h-screen bg-[#0f1016] text-white">
      <JsonLd data={localBusinessJsonLd} />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Find Us</h1>
          <Link
            href="/"
            className="text-sm text-purple-300 hover:text-purple-200"
          >
            Back to Shop
          </Link>
        </div>

        {tenant.address && (
          <p className="mb-6 text-gray-300">
            Address: <span className="text-gray-100">{tenant.address}</span>
          </p>
        )}
        {tenant.phone && (
          <p className="mb-6 text-gray-300">
            Phone: <span className="text-gray-100">{tenant.phone}</span>
          </p>
        )}

        {(profile.openingHours.length > 0 ||
          profile.serviceAreas.length > 0) && (
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            {profile.openingHours.map((hours) => (
              <section
                key={`${hours.days.join("-")}-${hours.opens}`}
                className="border border-white/10 bg-white/5 p-5"
              >
                <h2 className="font-bold text-white">Opening hours</h2>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                  {hours.days.join(", ")} · {hours.opens}–{hours.closes}
                </p>
              </section>
            ))}
            {profile.serviceAreas.length > 0 && (
              <section className="border border-white/10 bg-white/5 p-5">
                <h2 className="font-bold text-white">Service areas</h2>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                  {profile.serviceAreas.join(", ")}
                </p>
              </section>
            )}
          </div>
        )}

        {hasCoords ? (
          <FindUsMap
            lat={lat}
            lng={lng}
            address={tenant.address ?? undefined}
          />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-gray-300">
            This store hasn’t configured a pickup location yet.
          </div>
        )}
      </div>
    </main>
  );
}
