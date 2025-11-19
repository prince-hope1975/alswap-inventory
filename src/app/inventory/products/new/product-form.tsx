"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

const productSchema = z.object({
    name: z.string().min(1, "Name is required"),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    price: z.number().min(0, "Price must be positive"),
    costPrice: z.number().min(0, "Cost price must be positive").optional(),
    stockQuantity: z.number().int().min(0, "Stock must be non-negative"),
    lowStockThreshold: z.number().int().min(0).default(5),
});

type ProductFormValues = z.infer<typeof productSchema>;

export function ProductForm() {
    const router = useRouter();
    const createProduct = api.inventory.createProduct.useMutation({
        onSuccess: () => {
            router.push("/inventory/products");
            router.refresh();
        },
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(productSchema),
        defaultValues: {
            stockQuantity: 0,
            lowStockThreshold: 5,
        },
    });

    const onSubmit = (data: ProductFormValues) => {
        createProduct.mutate({
            ...data,
            price: Number(data.price),
            costPrice: data.costPrice ? Number(data.costPrice) : undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
            <div className="grid gap-6 md:grid-cols-2">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Product Name
                    </label>
                    <input
                        {...register("name")}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        SKU
                    </label>
                    <input
                        {...register("sku")}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Barcode
                    </label>
                    <input
                        {...register("barcode")}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Price ($)
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
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Initial Stock
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
                </div>
            </div>

            <div className="flex justify-end gap-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={createProduct.isPending}
                    className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                    {createProduct.isPending ? "Creating..." : "Create Product"}
                </button>
            </div>
        </form>
    );
}
