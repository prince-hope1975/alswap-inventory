import Link from "next/link";
import { api } from "~/trpc/server";

export default async function AboutPage() {
  const shopDetails = await api.shop.getShopDetails();
  const tenant = shopDetails.tenant;

  return (
    <main className="min-h-screen bg-[#0f1016] text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">About {tenant?.name ?? "our store"}</h1>
          <Link href="/" className="text-sm text-purple-300 hover:text-purple-200">
            Back to Shop
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-gray-300">
            {tenant?.name ?? "We"} sell quality products with a simple checkout experience. You can
            choose delivery or reserve items for pickup at our location.
          </p>

          {tenant?.phone && (
            <p className="mt-4 text-sm text-gray-400">
              Phone: <span className="text-gray-200">{tenant.phone}</span>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}


