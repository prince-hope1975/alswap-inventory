"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { ensureLeafletMarkerIcons } from "./leaflet-setup";

type LocationValue = {
  lat: number;
  lng: number;
  address?: string;
};

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

function ClickToSetMarker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationPicker({
  label = "Pickup location",
  value,
  onChange,
  defaultCenter = { lat: 6.5244, lng: 3.3792 }, // Lagos
  readOnly = false,
}: {
  label?: string;
  value?: LocationValue | null;
  onChange: (next: LocationValue) => void;
  defaultCenter?: { lat: number; lng: number };
  readOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    ensureLeafletMarkerIcons();
  }, []);

  const center: LatLngExpression = useMemo(() => {
    if (value?.lat != null && value?.lng != null) return [value.lat, value.lng];
    return [defaultCenter.lat, defaultCenter.lng];
  }, [defaultCenter.lat, defaultCenter.lng, value?.lat, value?.lng]);

  async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lng));
      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return undefined;
      const data = (await res.json()) as { display_name?: string };
      return data.display_name;
    } catch {
      return undefined;
    }
  }

  async function pick(lat: number, lng: number, address?: string) {
    const addr = address ?? (await reverseGeocode(lat, lng));
    onChange({ lat, lng, address: addr });
  }

  async function doSearch() {
    const q = query.trim();
    if (!q) return;
    setIsSearching(true);
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("q", q);
      url.searchParams.set("limit", "5");
      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      const data = (await res.json()) as NominatimResult[];
      setResults(Array.isArray(data) ? data : []);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {readOnly ? "This is the store location." : "Search for a place or click on the map to set the pickup point."}
          </p>
        </div>
      </div>

      {!readOnly && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search e.g. 'Ikeja City Mall' or 'Yaba Lagos'"
            className="flex-1 rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-purple-500 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
          <button
            type="button"
            onClick={doSearch}
            disabled={isSearching || !query.trim()}
            className="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>
      )}

      {!readOnly && results.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800">
          {results.map((r) => (
            <button
              key={`${r.lat}-${r.lon}-${r.display_name}`}
              type="button"
              onClick={() => {
                const lat = Number(r.lat);
                const lng = Number(r.lon);
                void pick(lat, lng, r.display_name);
                setResults([]);
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
        <MapContainer
          center={center}
          zoom={13}
          scrollWheelZoom={true}
          className="h-80 w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {!readOnly && <ClickToSetMarker onPick={(lat, lng) => void pick(lat, lng)} />}
          {value?.lat != null && value?.lng != null && (
            <Marker position={[value.lat, value.lng]} />
          )}
        </MapContainer>
      </div>

      {value?.address && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
          <div className="font-medium">Selected address</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{value.address}</div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Lat/Lng: {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
          </div>
        </div>
      )}
    </div>
  );
}


