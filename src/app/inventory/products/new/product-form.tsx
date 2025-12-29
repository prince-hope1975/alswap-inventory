"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { ImageUpload } from "~/app/_components/image-upload";
import { CreateCategoryDialog } from "~/app/_components/create-category-dialog";
import { SimilarProductsPanel } from "./similar-products-panel";
import { toast } from "~/lib/toast";
import { X, ChevronDown } from "lucide-react";

const productSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    image: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    images: z.array(z.string().url("Must be a valid URL")).optional(),
    categoryIds: z.array(z.number()).optional(),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    price: z.number().min(0, "Price must be positive"),
    costPrice: z.number().min(0, "Cost price is required and must be positive"),
    stockQuantity: z.number().int().min(-1, "Stock must be -1 (unknown) or greater"),
    lowStockThreshold: z.number().int().min(0),
}).refine(
    (data) => {
        // Skip validation if quantity is unknown (-1)
        if (data.stockQuantity === -1) {
            return true;
        }
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
    initialData?: {
        id: string;
        name: string;
        description?: string | null;
        image?: string | null;
        images?: string[] | null;
        categoryId?: number | null;
        sku?: string | null;
        barcode?: string | null;
        price: string;
        costPrice?: string | null;
        stockQuantity: number;
        lowStockThreshold?: number | null;
        productCategories?: { category: { id: number; name: string } }[];
    };
    isEditing?: boolean;
    categories?: { id: number; name: string }[];
}

export function ProductForm({ initialData, isEditing = false, categories: _categories }: ProductFormProps) {
    const router = useRouter();
    const { currency } = useCurrency();
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

    const utils = api.useUtils();

    // Fetch categories on the fly
    const { data: categoryList = [], isLoading: categoriesLoading, error: categoriesError } = api.inventory.listCategories.useQuery();

    const createProduct = api.inventory.createProduct.useMutation({
        onSuccess: () => {
            toast.success("Product created successfully!");
            router.push("/inventory/products");
            router.refresh();
        },
        onError: (error) => {
            toast.error(`Failed to create product: ${error.message}`);
        },
    });

    const updateProduct = api.inventory.updateProduct.useMutation({
        onSuccess: () => {
            toast.success("Product updated successfully!");
            router.push("/inventory/products");
            router.refresh();
            utils.inventory.listProducts.invalidate();
        },
        onError: (error) => {
            toast.error(`Failed to update product: ${error.message}`);
        },
    });

    // Extract existing category IDs from productCategories relation
    const existingCategoryIds = initialData?.productCategories?.map(pc => pc.category.id) 
        ?? (initialData?.categoryId ? [initialData.categoryId] : []);

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
                name: initialData.name,
                description: initialData.description ?? "",
                categoryIds: existingCategoryIds,
                image: initialData.image ?? "",
                images: initialData.images ?? [],
                sku: initialData.sku ?? "",
                barcode: initialData.barcode ?? "",
                price: parseFloat(initialData.price),
                costPrice: parseFloat(initialData.costPrice ?? "0"),
                stockQuantity: initialData.stockQuantity,
                lowStockThreshold: initialData.lowStockThreshold ?? 5,
            }
            : {
                name: "",
                description: "",
                price: 0,
                costPrice: 0,
                stockQuantity: 0,
                lowStockThreshold: 5,
                image: "",
                images: [],
                categoryIds: [],
            },
    });

    // Watch stockQuantity and lowStockThreshold to trigger validation
    const stockQuantity = watch("stockQuantity");
    const lowStockThreshold = watch("lowStockThreshold");
    const selectedCategoryIds = watch("categoryIds") || [];

    // Trigger validation when stockQuantity or lowStockThreshold changes
    useEffect(() => {
        if (stockQuantity !== undefined && lowStockThreshold !== undefined) {
            trigger("lowStockThreshold");
        }
    }, [stockQuantity, lowStockThreshold, trigger]);

    const onSubmit = (data: ProductFormValues) => {
        const formattedData = {
            ...data,
            categoryIds: data.categoryIds || [],
            categoryId: data.categoryIds?.[0], // First category as primary for backward compat
            price: Number(data.price),
            costPrice: Number(data.costPrice),
            image: data.image || undefined,
            description: data.description || undefined,
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
        // Add the new category to selected categories
        const currentIds = watch("categoryIds") || [];
        setValue("categoryIds", [...currentIds, newCategory.id]);
    };

    const toggleCategory = (categoryId: number) => {
        const currentIds = watch("categoryIds") || [];
        if (currentIds.includes(categoryId)) {
            setValue("categoryIds", currentIds.filter(id => id !== categoryId));
        } else {
            setValue("categoryIds", [...currentIds, categoryId]);
        }
    };

    const removeCategory = (categoryId: number) => {
        const currentIds = watch("categoryIds") || [];
        setValue("categoryIds", currentIds.filter(id => id !== categoryId));
    };

    const getSelectedCategoryNames = () => {
        return categoryList.filter(cat => selectedCategoryIds.includes(cat.id));
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

                            {/* Similar Products Panel */}
                            {!isEditing && (
                                <SimilarProductsPanel
                                    searchName={watch("name") || ""}
                                    onUseProduct={(product) => {
                                        // Pre-fill form with existing product data
                                        setValue("description", product.description || "");
                                        setValue("price", parseFloat(product.price));
                                        setValue("costPrice", parseFloat(product.costPrice || "0"));
                                        setValue("stockQuantity", product.stockQuantity);
                                        // Handle categories
                                        if (product.categoryId) {
                                            setValue("categoryIds", [product.categoryId]);
                                        }
                                        setValue("sku", product.sku || "");
                                        setValue("barcode", product.barcode || "");
                                        setValue("image", product.image || "");
                                        if (product.images) {
                                            setValue("images", product.images);
                                        }
                                    }}
                                />
                            )}
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Description
                            </label>
                            <textarea
                                {...register("description")}
                                placeholder="e.g. High-quality wireless headphones with noise cancellation and 30-hour battery life"
                                rows={4}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-[var(--brand-primary-focus)] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            {errors.description && (
                                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                A detailed description of the product features and specifications.
                            </p>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Categories
                            </label>
                            
                            {/* Selected Categories Tags */}
                            {selectedCategoryIds.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {getSelectedCategoryNames().map((category) => (
                                        <span
                                            key={category.id}
                                            className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-primary-100)] px-3 py-1 text-sm font-medium text-[var(--brand-primary-800)] dark:bg-[var(--brand-primary-900)] dark:text-[var(--brand-primary-200)]"
                                        >
                                            {category.name}
                                            <button
                                                type="button"
                                                onClick={() => removeCategory(category.id)}
                                                className="ml-1 rounded-full p-0.5 hover:bg-[var(--brand-primary-200)] dark:hover:bg-[var(--brand-primary-800)]"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Category Dropdown */}
                            <div className="relative mt-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                        disabled={categoriesLoading}
                                        className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-[var(--brand-primary-focus)] disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    >
                                        <span className="text-gray-500 dark:text-gray-400">
                                            {categoriesLoading 
                                                ? "Loading categories..." 
                                                : selectedCategoryIds.length === 0 
                                                    ? "Select categories" 
                                                    : `${selectedCategoryIds.length} selected`}
                                        </span>
                                        <ChevronDown className={`h-4 w-4 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    <CreateCategoryDialog onCategoryCreated={handleCategoryCreated} />
                                </div>

                                {/* Dropdown Menu */}
                                {isCategoryDropdownOpen && (
                                    <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
                                        {categoryList.length === 0 ? (
                                            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                                No categories found - create one first
                                            </div>
                                        ) : (
                                            categoryList.map((category) => (
                                                <label
                                                    key={category.id}
                                                    className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedCategoryIds.includes(category.id)}
                                                        onChange={() => toggleCategory(category.id)}
                                                        className="h-4 w-4 rounded border-gray-300 text-[var(--brand-primary-600)] focus:ring-[var(--brand-primary-focus)] dark:border-gray-500 dark:bg-gray-600"
                                                    />
                                                    <span className="text-sm text-gray-700 dark:text-gray-200">
                                                        {category.name}
                                                    </span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {categoriesError && (
                                <p className="mt-1 text-sm text-red-600">
                                    Error loading categories: {categoriesError.message}
                                </p>
                            )}
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Assign one or more categories for better organization and filtering.
                            </p>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Product Images
                            </label>
                            <div className="mt-1 space-y-4">
                                {/* Primary Image */}
                                <div>
                                    <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                                        Primary Image (shown in listings)
                                    </p>
                                    <ImageUpload
                                        value={watch("image") || ""}
                                        onChange={(url) => setValue("image", url)}
                                    />
                                    {errors.image && (
                                        <p className="mt-1 text-sm text-red-600">{errors.image.message}</p>
                                    )}
                                </div>

                                {/* Additional Images */}
                                <div>
                                    <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                                        Additional Images (optional)
                                    </p>
                                    <div className="space-y-2">
                                        {(watch("images") || []).map((imageUrl, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <div className="flex-1">
                                                    <ImageUpload
                                                        value={imageUrl}
                                                        onChange={(url) => {
                                                            const currentImages = watch("images") || [];
                                                            const newImages = [...currentImages];
                                                            newImages[index] = url;
                                                            setValue("images", newImages);
                                                        }}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const currentImages = watch("images") || [];
                                                        const newImages = currentImages.filter((_, i) => i !== index);
                                                        setValue("images", newImages);
                                                    }}
                                                    className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const currentImages = watch("images") || [];
                                                setValue("images", [...currentImages, ""]);
                                            }}
                                            className="w-full rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-800"
                                        >
                                            + Add Another Image
                                        </button>
                                    </div>
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
                            <div className="mt-1 space-y-2">
                                <input
                                    type="number"
                                    {...register("stockQuantity", { valueAsNumber: true })}
                                    disabled={watch("stockQuantity") === -1}
                                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-[var(--brand-primary-focus)] disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
                                />
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={watch("stockQuantity") === -1}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setValue("stockQuantity", -1);
                                            } else {
                                                setValue("stockQuantity", 0);
                                            }
                                        }}
                                        className="h-4 w-4 rounded border-gray-300 text-[var(--brand-primary-600)] focus:ring-[var(--brand-primary-focus)] dark:border-gray-600 dark:bg-gray-700"
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        Quantity Unknown
                                    </span>
                                </label>
                            </div>
                            {errors.stockQuantity && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.stockQuantity.message}
                                </p>
                            )}
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {watch("stockQuantity") === -1
                                    ? "This product's quantity is currently unknown and will be excluded from stock calculations."
                                    : "Quantity currently available on hand."}
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
