import type { Metadata } from "next";

import { ElectricalHome } from "./_components/home/electrical-home";
import { PublicStoreUnavailable } from "./_components/shop/public-store-unavailable";
import { buildOrganization, buildWebSite } from "~/lib/seo/builders";
import { JsonLd } from "~/lib/seo/json-ld";
import { canonicalUrl } from "~/lib/seo/base-url";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Electrical supplies, tools and solar solutions",
  description:
    "Electrical retail, project sourcing and solar solutions for homes, businesses and installers.",
};

export default async function Home() {
  const shopDetails = await api.shop.getShopDetails();
  const tenant = shopDetails.tenant;

  if (!tenant) return <PublicStoreUnavailable />;

  const siteUrl = await canonicalUrl("/");
  const organizationJsonLd = buildOrganization({
    name: tenant.name,
    url: siteUrl,
    logo: tenant.logo,
    phone: tenant.phone,
  });
  const websiteJsonLd = buildWebSite({
    name: tenant.name,
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
        }}
      />
    </>
  );
}
