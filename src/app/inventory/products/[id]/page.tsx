import { api, HydrateClient } from "~/trpc/server";
import { ProductForm } from "../new/product-form";
import { notFound } from "next/navigation";

export default async function EditProductPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const product = await api.inventory.getProduct({ id: params.id });
    const categories = await api.inventory.listCategories();

    if (!product) {
        notFound();
    }

    // Transform product data to match form schema
    const initialData = {
        ...product,
        sku: product.sku ?? undefined,
        barcode: product.barcode ?? undefined,
        categoryId: product.categoryId ?? undefined,
        costPrice: product.costPrice ? Number(product.costPrice) : undefined,
        price: Number(product.price),
        stockQuantity: product.stockQuantity,
        lowStockThreshold: product.lowStockThreshold ?? 5,
    };

    return (
        <HydrateClient>
            <div className="space-y-6">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Edit Product
                </h1>
                <ProductForm initialData={initialData} isEditing categories={categories} />
            </div>
        </HydrateClient>
    );
}

