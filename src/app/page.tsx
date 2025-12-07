import { HydrateClient } from "~/trpc/server";
import { CartProvider } from "./_components/shop/cart-context";
import { StoreLayout } from "./_components/shop/store-layout";

export default async function Home() {
  return (
    <HydrateClient>
      <CartProvider>
        <StoreLayout />
      </CartProvider>
    </HydrateClient>
  );
}
