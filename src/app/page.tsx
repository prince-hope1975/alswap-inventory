import { HydrateClient, api } from "~/trpc/server";
import { CartProvider } from "./_components/shop/cart-context";
import { StoreLayout } from "./_components/shop/store-layout";

export default async function Home() {
  const shopDetails = await api.shop.getShopDetails();
  const categories = await api.shop.getCategories();
  const products = await api.shop.getProducts({ limit: 20 }); // Default limit matches UI

  return (
    <HydrateClient>
      <CartProvider>
        <StoreLayout
          initialShopDetails={shopDetails}
          initialCategories={categories}
          initialProducts={products}
        />
      </CartProvider>
    </HydrateClient>
  );
}
