"use client";

import dynamic from "next/dynamic";
import { Navigation, ArrowUpRight } from "lucide-react";
import {
  toAppleMapsDirectionsUrl,
  toGoogleMapsDirectionsUrl,
  toGoogleMapsQueryUrl,
} from "~/lib/maps";

const LocationPicker = dynamic(
  () =>
    import("~/app/_components/maps/location-picker").then(
      (mod) => mod.LocationPicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        aria-label="Loading store map"
        className="h-80 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5"
      />
    ),
  },
);

export function FindUsMap({
  lat,
  lng,
  address,
  googleMapsUrl,
}: {
  lat: number;
  lng: number;
  address?: string;
  googleMapsUrl?: string;
}) {
  const placeUrl = googleMapsUrl?.startsWith("https://")
    ? googleMapsUrl
    : toGoogleMapsQueryUrl({ lat, lng });
  return (
    <section
      aria-label="Store map and directions"
      className="rounded-2xl border border-[#14212b]/10 bg-white p-4 sm:p-6 dark:border-white/10 dark:bg-white/5"
    >
      <div className="mb-5 flex flex-wrap gap-3">
        <a
          href={toGoogleMapsDirectionsUrl({ lat, lng })}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0b6e99] px-5 text-sm font-semibold text-white hover:bg-[#07597d] focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:ring-offset-2"
        >
          <Navigation className="h-4 w-4" />
          Get directions
        </a>
        <a
          href={placeUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-[#0b6e99] dark:border-white/20"
        >
          Open in Google Maps
          <ArrowUpRight className="h-4 w-4" />
        </a>
        <a
          href={toAppleMapsDirectionsUrl({ lat, lng })}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 items-center rounded-xl px-4 text-sm font-semibold text-[#0b6e99] focus-visible:ring-2 focus-visible:ring-[#0b6e99] dark:text-[#8dc5dc]"
        >
          Apple Maps
        </a>
      </div>
      <LocationPicker
        label="Our store"
        value={{ lat, lng, address }}
        readOnly
        onChange={() => undefined}
      />
      <p className="mt-4 text-sm leading-6 text-[#53636d] dark:text-gray-300">
        Opening a maps app will show the route from your location. Call the
        store if you need help finding us.
      </p>
    </section>
  );
}
