import { describe, expect, it } from "vitest";

import {
  buildArticle,
  buildBreadcrumbs,
  buildCollectionPage,
  buildLocalBusiness,
  buildOrganization,
  buildProduct,
  buildWebSite,
} from "./builders";

describe("buildProduct", () => {
  it("maps condition to the matching schema.org itemCondition URL", () => {
    const usedProduct = buildProduct({
      id: "p1",
      name: "Used inverter",
      images: [],
      condition: "USED",
      url: "https://shop.example.com/products/used-inverter",
      price: 1000,
      stockQuantity: 3,
      sellerName: "Alswap",
    });
    expect(usedProduct.offers.itemCondition).toBe(
      "https://schema.org/UsedCondition",
    );
  });

  it("reports OutOfStock only when stockQuantity is exactly 0", () => {
    const outOfStock = buildProduct({
      id: "p1",
      name: "X",
      images: [],
      condition: "NEW",
      url: "https://e/p",
      price: 1,
      stockQuantity: 0,
      sellerName: "S",
    });
    const unknownStock = buildProduct({
      id: "p1",
      name: "X",
      images: [],
      condition: "NEW",
      url: "https://e/p",
      price: 1,
      stockQuantity: -1,
      sellerName: "S",
    });
    expect(outOfStock.offers.availability).toBe(
      "https://schema.org/OutOfStock",
    );
    expect(unknownStock.offers.availability).toBe("https://schema.org/InStock");
  });

  it("omits aggregateRating when there are no approved reviews", () => {
    const product = buildProduct({
      id: "p1",
      name: "X",
      images: [],
      condition: "NEW",
      url: "https://e/p",
      price: 1,
      stockQuantity: 1,
      sellerName: "S",
      aggregateRating: null,
    });
    expect(product.aggregateRating).toBeUndefined();
  });
});

describe("buildBreadcrumbs", () => {
  it("numbers positions starting at 1", () => {
    const list = buildBreadcrumbs([
      { name: "Home", url: "https://e/" },
      { name: "Shop", url: "https://e/shop" },
    ]);
    expect(list.itemListElement.map((i) => i.position)).toEqual([1, 2]);
  });
});

describe("buildCollectionPage", () => {
  it("lists crawlable product URLs without embedding private inventory data", () => {
    const collection = buildCollectionPage({
      name: "Cables",
      description: "Cables for electrical work.",
      url: "https://e/categories/cables",
      products: [
        { name: "2m cable", url: "https://e/products/2m-cable", image: null },
      ],
    });

    expect(collection.mainEntity.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      url: "https://e/products/2m-cable",
      name: "2m cable",
      image: undefined,
    });
  });
});

describe("buildArticle", () => {
  it("falls back to the publisher as author when no author name is set", () => {
    const article = buildArticle({
      headline: "Guide",
      url: "https://e/articles/guide",
      publisherName: "Alswap",
    });
    expect(article.author).toEqual({ "@type": "Organization", name: "Alswap" });
  });

  it("publishes modified dates and a linked publisher identity", () => {
    const article = buildArticle({
      headline: "Guide",
      url: "https://e/articles/guide",
      publisherName: "Alswap",
      publisherUrl: "https://e/",
      dateModified: new Date("2026-08-08T10:00:00.000Z"),
    });

    expect(article.dateModified).toBe("2026-08-08T10:00:00.000Z");
    expect(article.publisher).toEqual({
      "@type": "Organization",
      name: "Alswap",
      url: "https://e/",
    });
  });
});

describe("buildOrganization / buildLocalBusiness / buildWebSite", () => {
  it("omits geo when coordinates are missing", () => {
    const business = buildLocalBusiness({
      name: "Alswap",
      url: "https://e/find-us",
    });
    expect(business.geo).toBeUndefined();
  });

  it("publishes alternate names on the local business only when given", () => {
    const named = buildLocalBusiness({
      name: "SPPD AMAKS",
      alternateNames: ["SPPD Amak's"],
      url: "https://e/about",
    });
    expect(named.alternateName).toEqual(["SPPD Amak's"]);
    expect(
      buildLocalBusiness({ name: "Alswap", url: "https://e/about" })
        .alternateName,
    ).toBeUndefined();
  });

  it("splits the locality out of the street line", () => {
    const business = buildLocalBusiness({
      name: "Alswap",
      url: "https://e/find-us",
      address: "1 Example Road, Jeddo",
      locality: "Warri",
    });
    expect(business.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "1 Example Road, Jeddo",
      addressLocality: "Warri",
    });
  });

  it("still emits an address when only the locality is known", () => {
    const business = buildLocalBusiness({
      name: "Alswap",
      url: "https://e/find-us",
      locality: "Warri",
    });
    expect(business.address?.addressLocality).toBe("Warri");
    expect(business.address?.streetAddress).toBeUndefined();
  });

  it("omits the address entirely when neither field is filled in", () => {
    const business = buildLocalBusiness({
      name: "Alswap",
      url: "https://e/find-us",
      address: "",
      locality: null,
    });
    expect(business.address).toBeUndefined();
  });

  it("includes a SearchAction only when a search URL template is given", () => {
    const withSearch = buildWebSite({
      name: "Alswap",
      url: "https://e/",
      searchUrlTemplate: "https://e/shop?search={search_term_string}",
    });
    const withoutSearch = buildWebSite({ name: "Alswap", url: "https://e/" });
    expect(withSearch.potentialAction).toBeDefined();
    expect(withoutSearch.potentialAction).toBeUndefined();
  });

  it("publishes alternate names only when given", () => {
    const named = { name: "SPPD AMAKS", url: "https://e/" };
    expect(
      buildWebSite({ ...named, alternateNames: ["SPPD Amak's"] }).alternateName,
    ).toEqual(["SPPD Amak's"]);
    expect(buildOrganization(named).alternateName).toBeUndefined();
  });

  it("omits contactPoint when there is no phone", () => {
    const org = buildOrganization({ name: "Alswap", url: "https://e/" });
    expect(org.contactPoint).toBeUndefined();
  });

  it("connects the organization to verified profiles", () => {
    const org = buildOrganization({
      name: "Alswap",
      url: "https://e/",
      sameAs: ["https://www.instagram.com/alswap", ""],
    });
    expect(org.sameAs).toEqual(["https://www.instagram.com/alswap"]);
  });

  it("adds truthful service areas and opening hours to the local business", () => {
    const business = buildLocalBusiness({
      name: "Alswap",
      url: "https://e/find-us",
      serviceAreas: ["Warri", "Jeddo"],
      openingHours: [
        { days: ["Monday", "Tuesday"], opens: "08:00", closes: "18:00" },
      ],
    });

    expect(business.areaServed).toEqual([
      { "@type": "City", name: "Warri" },
      { "@type": "City", name: "Jeddo" },
    ]);
    expect(business.openingHoursSpecification).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday"],
        opens: "08:00",
        closes: "18:00",
      },
    ]);
  });
});
