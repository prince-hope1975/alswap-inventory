import { api, HydrateClient } from "~/trpc/server";
import { CategoryList } from "./category-list";

export default async function CategoriesPage() {
  const categories = await api.inventory.listCategories();

  return (
    <HydrateClient>
      <CategoryList initialCategories={categories} />
    </HydrateClient>
  );
}

