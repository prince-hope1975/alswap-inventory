"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { LocationPicker } from "~/app/_components/maps/location-picker";

export default function FindUsPage() {
  const { data, isLoading } = api.shop.getShopDetails.useQuery();
  const tenant = data?.tenant;

  const lat = tenant?.latitude ? Number(tenant.latitude) : undefined;
  const lng = tenant?.longitude ? Number(tenant.longitude) : undefined;

  return (
    <main className="min-h-screen bg-[#0f1016] text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Find Us</h1>
          <Link href="/" className="text-sm text-purple-300 hover:text-purple-200">
            Back to Shop
          </Link>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-gray-300">
            Loading location...
          </div>
        ) : lat != null && lng != null ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="mb-4 text-gray-300">
              Pickup address:{" "}
              <span className="text-gray-200">{tenant?.address ?? "—"}</span>
            </p>

            {/* Read-only map: we re-use LocationPicker UI but ignore changes */}
            <LocationPicker
              label="Our pickup point"
              value={{ lat, lng, address: tenant?.address ?? undefined }}
              readOnly={true}
              onChange={() => {
                // Read-only for users.
              }}
            />

            <div className="mt-4 text-sm text-gray-400">
              Tip: You can click the marker area to see the exact coordinates, then open it in your
              preferred maps app.
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-gray-300">
            This store hasn’t configured a pickup location yet.
          </div>
        )}
      </div>
    </main>
  );
}


