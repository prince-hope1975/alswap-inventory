import type { MetadataRoute } from "next";

import { getTenantBranding } from "~/lib/tenant-branding";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { name, brandColor: themeColor } = await getTenantBranding();

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
