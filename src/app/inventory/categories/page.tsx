import { api, HydrateClient } from "~/trpc/server";
import { auth } from "~/server/auth";
import { CategoryList } from "./category-list";

export default async function CategoriesPage() {
  const [categories, session] = await Promise.all([
    api.inventory.listCategories(),
    auth(),
  ]);

  return (
    <HydrateClient>
      <CategoryList
        initialCategories={categories}
        canDelete={session?.user?.role === "ADMIN"}
      />
    </HydrateClient>
  );
}
