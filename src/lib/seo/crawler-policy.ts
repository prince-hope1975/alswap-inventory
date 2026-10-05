import type { MetadataRoute } from "next";

export type PublicSurface = "app" | "home" | "shop" | "solar" | "used";

const PRIVATE_PATHS = ["/inventory/", "/pos/", "/sales/", "/auth/", "/api/"];

/**
 * Crawlers that fetch pages to cite in AI answers or to act for a user who
 * asked about the store. Named explicitly so the intent is on record; a named
 * group replaces the "*" group for that bot, so each repeats the same rules.
 */
const AI_SEARCH_AGENTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
];

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
        allow: [...publicAllow, "/llms.txt"],
        disallow: PRIVATE_PATHS,
      },
      ...AI_SEARCH_AGENTS.map((userAgent) => ({
        userAgent,
        allow: [...publicAllow, "/llms.txt"],
        disallow: PRIVATE_PATHS,
      })),
      { userAgent: "GPTBot", disallow: "/" },
    ],
  };
}
