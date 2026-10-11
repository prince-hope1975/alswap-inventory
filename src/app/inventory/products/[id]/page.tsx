import { api, HydrateClient } from "~/trpc/server";
import { ProductForm } from "../new/product-form";
import { notFound } from "next/navigation";
import { toProductFormInitialData } from "~/lib/domain/product-form-data";
import { ProductsBackLink } from "../back-link";

export default async function EditProductPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const [product, categories] = await Promise.all([
        api.inventory.getProduct({ id: params.id }),
        api.inventory.listCategories(),
    ]);

    if (!product) {
        notFound();
    }

    return (
        <HydrateClient>
            <div className="space-y-6">
                <div className="space-y-2">
                    <ProductsBackLink current={product.name} />
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Edit product</h1>
                </div>
                <ProductForm
                    initialData={toProductFormInitialData(product)}
                    isEditing
                    categories={categories}
                />
            </div>
        </HydrateClient>
    );
}
