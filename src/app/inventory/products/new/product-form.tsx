"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { ImageUpload } from "~/app/_components/image-upload";
import { CreateCategoryDialog } from "~/app/_components/create-category-dialog";

const productSchema = z.object({
    name: z.string().min(1, "Name is required"),
    image: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    categoryId: z.number().optional(),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    price: z.number().min(0, "Price must be positive"),
    costPrice: z.number().min(0, "Cost price is required and must be positive"),
    stockQuantity: z.number().int().min(0, "Stock must be non-negative"),
    lowStockThreshold: z.number().int().min(0),
}).refine(
    (data) => {
        // If stockQuantity is 0, allow any threshold >= 0
        // Otherwise, threshold must be less than stockQuantity
        if (data.stockQuantity === 0) {
            return data.lowStockThreshold >= 0;
        }
        return data.lowStockThreshold < data.stockQuantity;
    },
    {
        message: "Low stock threshold must be less than current stock quantity",
        path: ["lowStockThreshold"],
    }
);

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
    initialData?: ProductFormValues & { id: string };
    isEditing?: boolean;
    categories?: { id: number; name: string }[]; // Kept for backward compatibility but not used
}

export function ProductForm({ initialData, isEditing = false, categories: _categories }: ProductFormProps) {
    const router = useRouter();
    const { currency } = useCurrency();
    
    const utils = api.useUtils();
    
    // Fetch categories on the fly
    const { data: categoryList = [], isLoading: categoriesLoading, error: categoriesError } = api.inventory.listCategories.useQuery();

    const createProduct = api.inventory.createProduct.useMutation({
        onSuccess: () => {
            router.push("/inventory/products");
            router.refresh();
        },
    });

    const updateProduct = api.inventory.updateProduct.useMutation({
        onSuccess: () => {
            router.push("/inventory/products");
            router.refresh();
            utils.inventory.listProducts.invalidate();
        },
    });

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        trigger,
        formState: { errors },
    } = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: initialData
            ? {
                  ...initialData,
                  categoryId: initialData.categoryId ?? undefined,
                  image: initialData.image ?? "",
              }
            : {
                  name: "",
                  price: 0,
                  costPrice: 0,
                  stockQuantity: 0,
                  lowStockThreshold: 5,
                  image: "",
              },
    });

    // Watch stockQuantity and lowStockThreshold to trigger validation
    const stockQuantity = watch("stockQuantity");
    const lowStockThreshold = watch("lowStockThreshold");
    
    // Trigger validation when stockQuantity or lowStockThreshold changes
    useEffect(() => {
        if (stockQuantity !== undefined && lowStockThreshold !== undefined) {
            trigger("lowStockThreshold");
        }
    }, [stockQuantity, lowStockThreshold, trigger]);

    const onSubmit = (data: ProductFormValues) => {
        const formattedData = {
            ...data,
            categoryId: data.categoryId ? Number(data.categoryId) : undefined,
            price: Number(data.price),
            costPrice: Number(data.costPrice),
            image: data.image || undefined,
        };

        if (isEditing && initialData) {
            updateProduct.mutate({
                id: initialData.id,
                ...formattedData,
            });
        } else {
            createProduct.mutate(formattedData);
        }
    };

    const handleCategoryCreated = async (newCategory: { id: number; name: string }) => {
        // Refetch categories to get the latest list
        await utils.inventory.listCategories.refetch();
        setValue("categoryId", newCategory.id);
    };

    const isPending = createProduct.isPending || updateProduct.isPending;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Information Section */}
            <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-1">
                    <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Basic Information</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        General details about the product including its name, category, and visual representation.
                    </p>
                </div>
                <div className="grid gap-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:col-span-2">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Product Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                {...register("name")}
                                placeholder="e.g. Wireless Headphones"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-[var(--brand-primary-focus)] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            {errors.name && (
                                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                The primary name of the product as it will appear in the catalog.
                            </p>
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Category
                            </label>
                            <div className="flex items-center gap-2">
                                <select
                                    {...register("categoryId", { valueAsNumber: true })}
                                    disabled={categoriesLoading}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-[var(--brand-primary-focus)] disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">Select a category</option>
                                    {categoriesLoading && (
                                        <option value="" disabled>
                                            Loading categories...
                                        </option>
                                    )}
                                    {!categoriesLoading && categoryList.length === 0 && (
                                        <option value="" disabled>
                                            No categories found - please create one
                                        </option>
                                    )}
                                    {categoryList.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                                <CreateCategoryDialog onCategoryCreated={handleCategoryCreated} />
                            </div>
                            {categoriesError && (
                                <p className="mt-1 text-sm text-red-600">
                                    Error loading categories: {categoriesError.message}
                                </p>
                            )}
                            {errors.categoryId && (
                                <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Organize items into groups for better reporting and filtering.
                            </p>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Product Image
                            </label>
                            <div className="mt-1">
                                <ImageUpload
                                    value={watch("image") || ""}
                                    onChange={(url) => setValue("image", url)}
                                />
                                {errors.image && (
                                    <p className="mt-1 text-sm text-red-600">{errors.image.message}</p>
                                )}
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Upload an image or provide a URL. You can crop uploaded images.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="my-8 border-t border-gray-200 dark:border-gray-700" />

            {/* Identifiers Section */}
            <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-1">
                    <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Identifiers</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Codes used to uniquely identify and track this specific product.
                    </p>
                </div>
                <div className="grid gap-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:col-span-2">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                SKU (Stock Keeping Unit)
                            </label>
                            <input
                                {...register("sku")}
                                placeholder="e.g. HEAD-001"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-[var(--brand-primary-focus)] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                A unique code for internal tracking and inventory management.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Barcode / UPC
                            </label>
                            <div className="relative mt-1">
                                <input
                                    {...register("barcode")}
                                    placeholder="Scan or enter barcode"
                                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-[var(--brand-primary-focus)] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                The Universal Product Code or barcode number for scanning at POS.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="my-8 border-t border-gray-200 dark:border-gray-700" />

            {/* Pricing & Inventory Section */}
            <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-1">
                    <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Pricing & Inventory</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Set the sales price, track costs, and manage stock levels.
                    </p>
                </div>
                <div className="grid gap-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:col-span-2">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Selling Price ({currency}) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                {...register("price", { valueAsNumber: true })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-[var(--brand-primary-focus)] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            {errors.price && (
                                <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                The amount customers will be charged at checkout.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Cost Price ({currency}) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                {...register("costPrice", { valueAsNumber: true })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-[var(--brand-primary-focus)] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            {errors.costPrice && (
                                <p className="mt-1 text-sm text-red-600">{errors.costPrice.message}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Your cost to acquire the product. Used for profit calculation.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Current Stock
                            </label>
                            <input
                                type="number"
                                {...register("stockQuantity", { valueAsNumber: true })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-[var(--brand-primary-focus)] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            {errors.stockQuantity && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.stockQuantity.message}
                                </p>
                            )}
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Quantity currently available on hand.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Low Stock Threshold
                            </label>
                            <input
                                type="number"
                                {...register("lowStockThreshold", { valueAsNumber: true })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-[var(--brand-primary-focus)] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            {errors.lowStockThreshold && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.lowStockThreshold.message}
                                </p>
                            )}
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Alert me when stock falls below this number. Must be less than current stock.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-4 border-t border-gray-200 pt-6 dark:border-gray-700">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="rounded-md border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-md bg-[var(--brand-primary-600)] px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--brand-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-focus)] focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900"
                >
                    {isPending ? "Saving Product..." : isEditing ? "Update Product" : "Create Product"}
                </button>
            </div>
        </form>
    );
}
