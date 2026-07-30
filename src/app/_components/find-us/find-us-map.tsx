"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";

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
  { ssr: false },
);

export function FindUsMap({
  lat,
  lng,
  address,
}: {
  lat: number;
  lng: number;
  address?: string;
}) {
  const reverse = useQuery({
    queryKey: ["nominatim", "reverse", lat, lng],
    queryFn: async () => {
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lng));

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      const json = (await res.json()) as { display_name?: string };
      return json.display_name ?? null;
    },
    staleTime: 60_000,
    retry: 1,
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 space-y-1 text-gray-300">
        <p>
          Saved address: <span className="text-gray-200">{address ?? "—"}</span>
        </p>
        <p className="text-sm text-gray-400">
          Detected from coordinates:{" "}
          <span className="text-gray-200">
            {reverse.isFetching ? "Detecting..." : (reverse.data ?? "—")}
          </span>
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <a
          href={toGoogleMapsDirectionsUrl({ lat, lng })}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-500"
        >
          Get Directions (Google Maps)
        </a>
        <a
          href={toGoogleMapsQueryUrl({ lat, lng })}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
        >
          Open in Google Maps
        </a>
        <a
          href={toAppleMapsDirectionsUrl({ lat, lng })}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
        >
          Open in Apple Maps
        </a>
      </div>

      {/* Read-only map: we re-use LocationPicker UI but ignore changes */}
      <LocationPicker
        label="Our pickup point"
        value={{ lat, lng, address }}
        readOnly={true}
        onChange={() => {
          // Read-only for users.
        }}
      />

      <div className="mt-4 text-sm text-gray-400">
        Tip: You can click the marker area to see the exact coordinates, then
        open it in your preferred maps app.
      </div>
    </div>
  );
}
