import type { Metadata } from "next";

import { ElectricalHome } from "./_components/home/electrical-home";
import { PublicStoreUnavailable } from "./_components/shop/public-store-unavailable";
import { buildOrganization, buildWebSite } from "~/lib/seo/builders";
import { JsonLd } from "~/lib/seo/json-ld";
import { canonicalUrl, requestBaseUrl, requestHost } from "~/lib/seo/base-url";
import {
  buildLandingMetadata,
  getSocialLanding,
} from "~/lib/seo/social-metadata";
import { api } from "~/trpc/server";
import { getPublicProfile } from "~/lib/seo/public-profile";
import type { StoreConfig } from "~/types/store-config";

export async function generateMetadata(): Promise<Metadata> {
  const [base, rawHost] = await Promise.all([requestBaseUrl(), requestHost()]);
  return buildLandingMetadata(base, getSocialLanding(rawHost, "home"));
}

export default async function Home() {
  const shopDetails = await api.shop.getShopDetails();
  const tenant = shopDetails.tenant;

  if (!tenant) return <PublicStoreUnavailable />;

  const [base, rawHost] = await Promise.all([requestBaseUrl(), requestHost()]);
  const landing = getSocialLanding(rawHost, "home");
  // Google reads the site name from WebSite data on the homepage itself, so
  // these must name the homepage URL, not the commerce host.
  const siteUrl = new URL(landing.canonicalPath, base).toString();
  const siteName = landing.siteName ?? tenant.name;
  const profile = getPublicProfile(tenant.storeConfig as StoreConfig | null);
  const organizationJsonLd = buildOrganization({
    name: siteName,
    alternateNames: landing.alternateNames,
    url: siteUrl,
    logo: tenant.logo,
    phone: tenant.phone,
    sameAs: profile.socialProfiles,
  });
  const websiteJsonLd = buildWebSite({
    name: siteName,
    alternateNames: landing.alternateNames,
    url: siteUrl,
    searchUrlTemplate: `${await canonicalUrl("/shop")}?search={search_term_string}`,
  });

  return (
    <>
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={websiteJsonLd} />
      <ElectricalHome
        tenant={{
          name: tenant.name,
          phone: tenant.phone,
          address: tenant.address,
          logo: tenant.logo,
          legalName: landing.legalName,
        }}
      />
    </>
  );
}
