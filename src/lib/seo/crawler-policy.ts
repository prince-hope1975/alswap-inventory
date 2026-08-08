import type { MetadataRoute } from "next";

export type PublicSurface = "app" | "home" | "shop" | "solar" | "used";

const PRIVATE_PATHS = ["/inventory/", "/pos/", "/sales/", "/auth/", "/api/"];

export function crawlerPolicy(
  surface: PublicSurface,
): Pick<MetadataRoute.Robots, "rules"> {
  if (surface === "app") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  const publicAllow =
    surface === "solar"
      ? ["/solar", "/articles/", "/guides"]
      : [
          "/",
          "/products/",
          "/categories/",
          "/articles/",
          "/guides",
          "/solar",
          "/api/feed/",
        ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: publicAllow,
        disallow: PRIVATE_PATHS,
      },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "GPTBot", disallow: "/" },
    ],
  };
}
