"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Image as ImageIcon, Info } from "lucide-react";
import { useState, useEffect } from "react";

const productSchema = z.object({
    name: z.string().min(1, "Name is required"),
    image: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    categoryId: z.number().optional(),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    price: z.number().min(0, "Price must be positive"),
    costPrice: z.number().min(0, "Cost price must be positive").optional(),
    stockQuantity: z.number().int().min(0, "Stock must be non-negative"),
    lowStockThreshold: z.number().int().min(0).default(5),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
    initialData?: ProductFormValues & { id: string };
    isEditing?: boolean;
    categories?: { id: number; name: string }[];
}

export function ProductForm({ initialData, isEditing = false, categories = [] }: ProductFormProps) {
    const router = useRouter();
    const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image || null);
    
    const utils = api.useUtils();

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
        watch,
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
                  stockQuantity: 0,
                  lowStockThreshold: 5,
                  image: "",
              },
    });

    // Watch image field to update preview
    const imageUrl = watch("image");
    useEffect(() => {
        if (imageUrl && !errors.image) {
            setImagePreview(imageUrl);
        } else if (!imageUrl) {
            setImagePreview(null);
        }
    }, [imageUrl, errors.image]);

    const onSubmit = (data: ProductFormValues) => {
        const formattedData = {
            ...data,
            categoryId: data.categoryId ? Number(data.categoryId) : undefined,
            price: Number(data.price),
            costPrice: data.costPrice ? Number(data.costPrice) : undefined,
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
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                            <select
                                {...register("categoryId", { valueAsNumber: true })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="">Select a category</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                            {errors.categoryId && (
                                <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Organize items into groups for better reporting and filtering.
                            </p>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Product Image URL
                            </label>
                            <div className="mt-1 flex gap-4">
                                <div className="flex-1">
                                    <input
                                        {...register("image")}
                                        placeholder="https://example.com/image.jpg"
                                        className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    />
                                    {errors.image && (
                                        <p className="mt-1 text-sm text-red-600">{errors.image.message}</p>
                                    )}
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        Provide a direct link to an image of the product.
                                    </p>
                                </div>
                                <div className="flex h-20 w-20 flex-none items-center justify-center rounded-md border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                                    {imagePreview ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="h-full w-full rounded-md object-cover"
                                            onError={() => setImagePreview(null)}
                                        />
                                    ) : (
                                        <ImageIcon className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                                    )}
                                </div>
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
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                                {/* Hint: You could add a scan icon button here later if implementing direct camera scan */}
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
                                Selling Price ($) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                {...register("price", { valueAsNumber: true })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                                Cost Price ($)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                {...register("costPrice", { valueAsNumber: true })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
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
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Alert me when stock falls below this number.
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
                    className="rounded-md bg-purple-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900"
                >
                    {isPending ? "Saving Product..." : isEditing ? "Update Product" : "Create Product"}
                </button>
            </div>
        </form>
    );
}
