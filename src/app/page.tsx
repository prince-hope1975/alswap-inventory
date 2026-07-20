import type { Metadata } from "next";

import { ElectricalHome } from "./_components/home/electrical-home";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Electrical supplies, tools and solar solutions",
  description: "Electrical retail, project sourcing and solar solutions for homes, businesses and installers.",
};

export default async function Home() {
  const shopDetails = await api.shop.getShopDetails();
  const tenant = shopDetails.tenant;

  return <ElectricalHome tenant={{
    name: tenant?.name ?? "Electrical Store",
    phone: tenant?.phone,
    address: tenant?.address,
    logo: tenant?.logo,
  }} />;
}
