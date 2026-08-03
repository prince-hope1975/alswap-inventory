import { describe, expect, it } from "vitest";

import {
  buildArticle,
  buildBreadcrumbs,
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

describe("buildArticle", () => {
  it("falls back to the publisher as author when no author name is set", () => {
    const article = buildArticle({
      headline: "Guide",
      url: "https://e/articles/guide",
      publisherName: "Alswap",
    });
    expect(article.author).toEqual({ "@type": "Organization", name: "Alswap" });
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

  it("omits contactPoint when there is no phone", () => {
    const org = buildOrganization({ name: "Alswap", url: "https://e/" });
    expect(org.contactPoint).toBeUndefined();
  });
});
