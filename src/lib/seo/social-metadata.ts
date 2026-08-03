import type { Metadata } from "next";

import {
  normalizeRequestHost,
  registrableRootFromHost,
  surfaceLabelFromHost,
} from "./host";

export type SocialPage = "home" | "shop" | "solar";
export type SocialSurface = "home" | "shop" | "used" | "solar";

export type SocialImage = {
  path: string;
  width: 1200;
  height: 630;
  alt: string;
};

export type SocialLanding = {
  branded: boolean;
  surface: SocialSurface;
  canonicalPath: "/" | "/shop" | "/solar";
  siteName: "SPPD AMAKS" | null;
  title: string;
  description: string;
  image: SocialImage | null;
};

const IMAGE_SIZE = { width: 1200, height: 630 } as const;

const LANDINGS: Record<
  SocialSurface,
  Omit<SocialLanding, "branded" | "canonicalPath" | "siteName">
> = {
  home: {
    surface: "home",
    title: "Electrical products for real work",
    description:
      "Electrical retail, project sourcing and solar solutions for homes, businesses and installers.",
    image: {
      path: "/og-images/home-electrical.png",
      ...IMAGE_SIZE,
      alt: "SPPD AMAKS electrical products for real work",
    },
  },
  shop: {
    surface: "shop",
    title: "Electrical supplies that fit the job",
    description:
      "Browse electrical supplies, tools, lighting, power equipment and accessories.",
    image: {
      path: "/og-images/shop-electrical.png",
      ...IMAGE_SIZE,
      alt: "SPPD AMAKS electrical supplies, tools and solar equipment",
    },
  },
  used: {
    surface: "used",
    title: "Tested equipment. Better value",
    description:
      "Shop tested used and refurbished electrical equipment at better value.",
    image: {
      path: "/og-images/used-equipment.png",
      ...IMAGE_SIZE,
      alt: "SPPD AMAKS tested used electrical equipment",
    },
  },
  solar: {
    surface: "solar",
    title: "Plan the load. Then plan the system",
    description:
      "Estimate the inverter, battery and solar panels needed, then request a verified installation survey.",
    image: {
      path: "/og-images/solar-planning.png",
      ...IMAGE_SIZE,
      alt: "SPPD AMAKS solar load and system planning",
    },
  },
};

function isSppdSocialHost(rawHost: string | null | undefined) {
  const host = normalizeRequestHost(rawHost);
  return (
    registrableRootFromHost(host) === "sppdamaks.com" ||
    host.endsWith(".vercel.app")
  );
}

function socialSurface(rawHost: string | null | undefined, page: SocialPage) {
  const hostSurface = surfaceLabelFromHost(rawHost);
  if (page === "shop" && hostSurface === "used") return "used";
  return page;
}

function canonicalPath(
  rawHost: string | null | undefined,
  page: SocialPage,
): SocialLanding["canonicalPath"] {
  const hostSurface = surfaceLabelFromHost(rawHost);
  if (page === "home") return "/";
  if (page === "shop") {
    return hostSurface === "shop" || hostSurface === "used" ? "/" : "/shop";
  }
  return hostSurface === "solar" ? "/" : "/solar";
}

export function getDefaultSocialPage(
  rawHost: string | null | undefined,
): SocialPage {
  const surface = surfaceLabelFromHost(rawHost);
  if (surface === "shop" || surface === "used") return "shop";
  if (surface === "solar") return "solar";
  return "home";
}

export function getSocialLanding(
  rawHost: string | null | undefined,
  page: SocialPage,
): SocialLanding {
  const branded = isSppdSocialHost(rawHost);
  const landing = LANDINGS[socialSurface(rawHost, page)];
  return {
    ...landing,
    branded,
    canonicalPath: canonicalPath(rawHost, page),
    siteName: branded ? "SPPD AMAKS" : null,
    image: branded ? landing.image : null,
  };
}

export function buildLandingMetadata(
  baseUrl: string,
  landing: SocialLanding,
): Metadata {
  const canonical = new URL(landing.canonicalPath, baseUrl).toString();
  const metadata: Metadata = {
    title: landing.title,
    description: landing.description,
    alternates: { canonical },
  };

  if (!landing.branded || !landing.image || !landing.siteName) return metadata;

  const imageUrl = new URL(landing.image.path, baseUrl).toString();
  return {
    ...metadata,
    openGraph: {
      title: landing.title,
      description: landing.description,
      siteName: landing.siteName,
      type: "website",
      url: canonical,
      images: [
        {
          url: imageUrl,
          width: landing.image.width,
          height: landing.image.height,
          type: "image/png",
          alt: landing.image.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: landing.title,
      description: landing.description,
      images: [imageUrl],
    },
  };
}
