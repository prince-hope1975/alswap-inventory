/**
 * Pure JSON-LD object builders. No `server-only` import and no data
 * fetching here — callers resolve URLs/tenant data (async, host-aware) and
 * pass plain values in, which keeps these testable without mocking
 * `headers()`.
 */

const CONDITION_URL: Record<"NEW" | "USED" | "REFURBISHED", string> = {
  NEW: "https://schema.org/NewCondition",
  USED: "https://schema.org/UsedCondition",
  REFURBISHED: "https://schema.org/RefurbishedCondition",
};

export function buildProduct(input: {
  id: string;
  name: string;
  description?: string | null;
  images: string[];
  sku?: string | null;
  brand?: string | null;
  gtin?: string | null;
  mpn?: string | null;
  condition: "NEW" | "USED" | "REFURBISHED";
  url: string;
  price: number;
  priceCurrency?: string;
  stockQuantity: number;
  sellerName: string;
  aggregateRating?: { average: number; count: number } | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": input.url,
    name: input.name,
    description: input.description ?? undefined,
    image: input.images.length ? input.images : undefined,
    sku: input.sku ?? undefined,
    brand: input.brand ? { "@type": "Brand", name: input.brand } : undefined,
    gtin: input.gtin ?? undefined,
    mpn: input.mpn ?? undefined,
    url: input.url,
    aggregateRating: input.aggregateRating
      ? {
          "@type": "AggregateRating",
          ratingValue: input.aggregateRating.average,
          reviewCount: input.aggregateRating.count,
        }
      : undefined,
    offers: {
      "@type": "Offer",
      url: input.url,
      priceCurrency: input.priceCurrency ?? "NGN",
      price: input.price,
      itemCondition: CONDITION_URL[input.condition],
      availability:
        input.stockQuantity === 0
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      seller: { "@type": "Organization", name: input.sellerName },
    },
  };
}

export function buildBreadcrumbs(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildArticle(input: {
  headline: string;
  description?: string | null;
  image?: string | null;
  url: string;
  datePublished?: Date | null;
  authorName?: string | null;
  publisherName: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": input.url,
    headline: input.headline,
    description: input.description ?? undefined,
    image: input.image ? [input.image] : undefined,
    url: input.url,
    datePublished: input.datePublished
      ? input.datePublished.toISOString()
      : undefined,
    author: input.authorName
      ? { "@type": "Person", name: input.authorName }
      : { "@type": "Organization", name: input.publisherName },
    publisher: { "@type": "Organization", name: input.publisherName },
  };
}

export function buildOrganization(input: {
  name: string;
  url: string;
  logo?: string | null;
  phone?: string | null;
  email?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${input.url}#organization`,
    name: input.name,
    url: input.url,
    logo: input.logo ?? undefined,
    contactPoint: input.phone
      ? {
          "@type": "ContactPoint",
          telephone: input.phone,
          contactType: "customer service",
          email: input.email ?? undefined,
        }
      : undefined,
  };
}

export function buildLocalBusiness(input: {
  name: string;
  url: string;
  image?: string | null;
  phone?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${input.url}#localbusiness`,
    name: input.name,
    url: input.url,
    image: input.image ?? undefined,
    telephone: input.phone ?? undefined,
    address: input.address
      ? { "@type": "PostalAddress", streetAddress: input.address }
      : undefined,
    geo:
      input.latitude != null && input.longitude != null
        ? {
            "@type": "GeoCoordinates",
            latitude: input.latitude,
            longitude: input.longitude,
          }
        : undefined,
  };
}

export function buildService(input: {
  name: string;
  description?: string | null;
  url: string;
  providerName: string;
  areaServed?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${input.url}#service`,
    name: input.name,
    description: input.description ?? undefined,
    url: input.url,
    areaServed: input.areaServed ?? undefined,
    provider: { "@type": "Organization", name: input.providerName },
    // Solar is made-to-order from a supplier, not stocked — PreOrder is the
    // honest availability state, not InStock.
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/PreOrder",
    },
  };
}

export function buildWebSite(input: {
  name: string;
  url: string;
  searchUrlTemplate?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${input.url}#website`,
    name: input.name,
    url: input.url,
    potentialAction: input.searchUrlTemplate
      ? {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: input.searchUrlTemplate,
          },
          "query-input": "required name=search_term_string",
        }
      : undefined,
  };
}
