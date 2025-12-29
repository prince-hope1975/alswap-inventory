"use client";

import L from "leaflet";

// Fix default marker icon paths in bundlers (Next.js).
// Leaflet expects these assets at specific URLs otherwise.
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

export function ensureLeafletMarkerIcons() {
  // Only run once.
  // @ts-expect-error - internal private flag
  if (globalThis.__alswapLeafletIconsPatched) return;
  // @ts-expect-error - internal private flag
  globalThis.__alswapLeafletIconsPatched = true;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });
}


