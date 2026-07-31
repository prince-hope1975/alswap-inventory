import type { MetadataRoute } from "next";

import { api } from "~/trpc/server";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let name = "Alswap";
  let themeColor = "#000000";
  try {
    const { tenant } = await api.shop.getShopDetails();
    if (tenant?.name) name = tenant.name;
    if (tenant?.brandColor) themeColor = tenant.brandColor;
  } catch {
    // Manifest is still valid without branding; fall back to the defaults.
  }

  return {
    name,
    short_name: name,
    description: `${name} — electrical, electronics and solar supplies.`,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: themeColor,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
