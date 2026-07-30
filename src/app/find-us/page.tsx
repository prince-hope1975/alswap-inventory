import type { Metadata } from "next";
import Link from "next/link";

import { FindUsMap } from "~/app/_components/find-us/find-us-map";
import { PublicStoreUnavailable } from "~/app/_components/shop/public-store-unavailable";
import { buildLocalBusiness } from "~/lib/seo/builders";
import { JsonLd } from "~/lib/seo/json-ld";
import { canonicalUrl } from "~/lib/seo/base-url";
import { api } from "~/trpc/server";

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
  const hasCoords =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);

  const localBusinessJsonLd = buildLocalBusiness({
    name: tenant.name,
    url: await canonicalUrl("/find-us"),
    image: tenant.logo,
    phone: tenant.phone,
    address: tenant.address,
    latitude: hasCoords ? lat : null,
    longitude: hasCoords ? lng : null,
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
