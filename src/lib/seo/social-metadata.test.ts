import { describe, expect, it } from "vitest";

import {
  buildLandingMetadata,
  getDefaultSocialPage,
  getSocialLanding,
} from "./social-metadata";

describe("getDefaultSocialPage", () => {
  it.each([
    ["www.sppdamaks.com", "home"],
    ["shop.sppdamaks.com", "shop"],
    ["used.sppdamaks.com", "shop"],
    ["solar.sppdamaks.com", "solar"],
  ] as const)("maps %s to the %s landing page", (host, page) => {
    expect(getDefaultSocialPage(host)).toBe(page);
  });
});

describe("getSocialLanding", () => {
  it("selects the main-site artwork on the SPPD homepage", () => {
    expect(getSocialLanding("www.sppdamaks.com", "home")).toMatchObject({
      branded: true,
      surface: "home",
      canonicalPath: "/",
      siteName: "SPPD AMAKS",
      title: "Electrical products for real work",
      image: {
        path: "/og-images/home-electrical.png",
        width: 1200,
        height: 630,
      },
    });
  });

  it("selects ordinary shop artwork for the shop surface root", () => {
    expect(getSocialLanding("shop.sppdamaks.com", "shop")).toMatchObject({
      branded: true,
      surface: "shop",
      canonicalPath: "/",
      title: "Electrical supplies that fit the job",
      image: { path: "/og-images/shop-electrical.png" },
    });
  });

  it("selects used-equipment artwork and copy on the used surface", () => {
    expect(getSocialLanding("used.sppdamaks.com", "shop")).toMatchObject({
      branded: true,
      surface: "used",
      canonicalPath: "/",
      title: "Tested equipment. Better value",
      description:
        "Shop tested used and refurbished electrical equipment at better value.",
      image: { path: "/og-images/used-equipment.png" },
    });
  });

  it("selects solar artwork for the solar surface root", () => {
    expect(getSocialLanding("solar.sppdamaks.com", "solar")).toMatchObject({
      branded: true,
      surface: "solar",
      canonicalPath: "/",
      title: "Plan the load. Then plan the system",
      image: { path: "/og-images/solar-planning.png" },
    });
  });

  it("uses SPPD artwork on this project's Vercel previews", () => {
    expect(
      getSocialLanding(
        "alswap-inventory-git-og-prince-charles-projects-59eea55f.vercel.app",
        "home",
      ),
    ).toMatchObject({
      branded: true,
      surface: "home",
      siteName: "SPPD AMAKS",
      image: { path: "/og-images/home-electrical.png" },
    });
  });

  it("does not leak SPPD branding onto unrelated tenant domains", () => {
    expect(getSocialLanding("shop.other-store.com", "shop")).toMatchObject({
      branded: false,
      surface: "shop",
      canonicalPath: "/",
      siteName: null,
      image: null,
    });
  });

  it("uses route canonicals when a landing page is opened off its surface", () => {
    expect(getSocialLanding("www.sppdamaks.com", "shop").canonicalPath).toBe(
      "/shop",
    );
    expect(getSocialLanding("www.sppdamaks.com", "solar").canonicalPath).toBe(
      "/solar",
    );
  });
});

describe("buildLandingMetadata", () => {
  it("emits complete absolute Open Graph and Twitter metadata", () => {
    const landing = getSocialLanding("shop.sppdamaks.com", "shop");

    expect(
      buildLandingMetadata("https://shop.sppdamaks.com", landing),
    ).toMatchObject({
      title: "Electrical supplies that fit the job",
      alternates: { canonical: "https://shop.sppdamaks.com/" },
      openGraph: {
        title: "Electrical supplies that fit the job",
        siteName: "SPPD AMAKS",
        url: "https://shop.sppdamaks.com/",
        images: [
          {
            url: "https://shop.sppdamaks.com/og-images/shop-electrical.png",
            width: 1200,
            height: 630,
            type: "image/png",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        images: ["https://shop.sppdamaks.com/og-images/shop-electrical.png"],
      },
    });
  });

  it("leaves unrelated tenants to inherit their root social metadata", () => {
    const landing = getSocialLanding("shop.other-store.com", "shop");
    const metadata = buildLandingMetadata(
      "https://shop.other-store.com",
      landing,
    );

    expect(metadata).toMatchObject({
      title: "Electrical supplies that fit the job",
      alternates: { canonical: "https://shop.other-store.com/" },
    });
    expect(metadata.openGraph).toBeUndefined();
    expect(metadata.twitter).toBeUndefined();
  });
});
