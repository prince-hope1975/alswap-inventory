"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { MultiImageUpload } from "~/app/_components/multi-image-upload";
import { CreateCategoryDialog } from "~/app/_components/create-category-dialog";
import { SimilarProductsPanel } from "./similar-products-panel";
import { AdjustStockButton } from "../adjust-stock";
import { toast } from "~/lib/toast";
import { cn } from "~/lib/utils";
import { X, ChevronDown, AlertTriangle } from "lucide-react";
import {
    lowStockThresholdWarning,
    optionalNumberInput,
    parseOptionalPrice,
    salePriceWarning,
} from "~/lib/domain/product-form-data";
import {
    btnPrimary,
    btnSecondary,
    checkboxCls,
    errorTextCls,
    hintCls,
    inputCls,
    labelCls,
} from "~/components/ui/styles";

const productSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    image: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    images: z.array(z.string().url("Must be a valid URL")).optional(),
    categoryIds: z.array(z.number()).optional(),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    price: z.number({ invalid_type_error: "Enter a price" }).min(0, "Price must be positive"),
    salePrice: z.number().min(0, "Sale price must be positive").optional().nullable(),
    costPrice: z.number({ invalid_type_error: "Enter a cost price" }).min(0, "Cost price is required and must be positive"),
    /** Only sent when creating; edits go through Adjust stock. */
    stockQuantity: z.number({ invalid_type_error: "Enter a quantity" }).int().min(-1, "Stock must be -1 (unknown) or greater"),
    lowStockThreshold: z.number({ invalid_type_error: "Enter a number" }).int().min(0),
});

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
        salePrice?: string | null;
        costPrice?: string | null;
        stockQuantity: number;
        lowStockThreshold?: number | null;
        productCategories?: { category: { id: number; name: string } }[];
    };
    isEditing?: boolean;
    categories?: { id: number; name: string }[];
    /** Prefills the name for a new product (e.g. from a Demand "not found" term). */
    defaultName?: string;
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <section className="grid gap-6 md:grid-cols-3 md:gap-8">
            <div className="md:col-span-1">
                <h2 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">{title}</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:col-span-2 dark:border-gray-700 dark:bg-gray-800">
                <div className="grid gap-6 md:grid-cols-2">{children}</div>
            </div>
        </section>
    );
}

export function ProductForm({ initialData, isEditing = false, defaultName }: ProductFormProps) {
    const router = useRouter();
    const { currency } = useCurrency();
    const uid = useId();
    const fid = (name: string) => `${uid}-${name}`;
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [isUploadingImages, setIsUploadingImages] = useState(false);
    const categoryBoxRef = useRef<HTMLDivElement>(null);
    const categoryButtonRef = useRef<HTMLButtonElement>(null);

    const utils = api.useUtils();

    const { data: categoryList = [], isLoading: categoriesLoading, error: categoriesError } = api.inventory.listCategories.useQuery();

    const createProduct = api.inventory.createProduct.useMutation({
        onSuccess: () => {
            toast.success("Product created");
            router.push("/inventory/products");
            router.refresh();
        },
        onError: (error) => {
            toast.error(`Failed to create product: ${error.message}`);
        },
    });

    const updateProduct = api.inventory.updateProduct.useMutation({
        onSuccess: () => {
            toast.success("Product updated");
            router.push("/inventory/products");
            router.refresh();
            void utils.inventory.listProducts.invalidate();
        },
        onError: (error) => {
            toast.error(`Failed to update product: ${error.message}`);
        },
    });

    const existingCategoryIds = initialData?.productCategories?.map((pc) => pc.category.id)
        ?? (initialData?.categoryId ? [initialData.categoryId] : []);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
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
                salePrice: parseOptionalPrice(initialData.salePrice),
                costPrice: parseFloat(initialData.costPrice ?? "0"),
                stockQuantity: initialData.stockQuantity,
                lowStockThreshold: initialData.lowStockThreshold ?? 5,
            }
            : {
                name: isEditing ? "" : (defaultName ?? ""),
                description: "",
                price: 0,
                salePrice: null,
                costPrice: 0,
                stockQuantity: 0,
                lowStockThreshold: 5,
                image: "",
                images: [],
                categoryIds: [],
            },
    });

    // When editing, stock comes from the server (the prop refreshes after
    // Adjust stock); the form never edits it.
    const formStock = watch("stockQuantity");
    const stockQuantity = isEditing && initialData ? initialData.stockQuantity : formStock;
    const lowStockThreshold = watch("lowStockThreshold");
    const selectedCategoryIds = watch("categoryIds") ?? [];
    const thresholdWarning = lowStockThresholdWarning(stockQuantity, lowStockThreshold);
    const saleWarning = salePriceWarning(watch("price"), watch("salePrice"));

    // Category dropdown: close on outside click or Esc.
    useEffect(() => {
        if (!isCategoryDropdownOpen) return;
        const onPointer = (e: PointerEvent) => {
            if (!categoryBoxRef.current?.contains(e.target as Node)) setIsCategoryDropdownOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsCategoryDropdownOpen(false);
                categoryButtonRef.current?.focus();
            }
        };
        document.addEventListener("pointerdown", onPointer);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onPointer);
            document.removeEventListener("keydown", onKey);
        };
    }, [isCategoryDropdownOpen]);

    const onSubmit = (data: ProductFormValues) => {
        const { stockQuantity: initialStock, ...rest } = data;
        const formattedData = {
            ...rest,
            categoryIds: data.categoryIds ?? [],
            categoryId: data.categoryIds?.[0], // First category as primary for backward compat
            price: Number(data.price),
            salePrice: data.salePrice ?? null,
            costPrice: Number(data.costPrice),
            image: data.image ?? undefined,
            description: data.description ?? undefined,
        };

        if (isEditing && initialData) {
            // Stock is deliberately omitted: it only changes via Adjust stock.
            updateProduct.mutate({ id: initialData.id, ...formattedData });
        } else {
            createProduct.mutate({ ...formattedData, stockQuantity: initialStock });
        }
    };

    const handleCategoryCreated = async (newCategory: { id: number; name: string }) => {
        await utils.inventory.listCategories.refetch();
        const currentIds = watch("categoryIds") ?? [];
        setValue("categoryIds", [...currentIds, newCategory.id]);
    };

    const toggleCategory = (categoryId: number) => {
        const currentIds = watch("categoryIds") ?? [];
        setValue(
            "categoryIds",
            currentIds.includes(categoryId) ? currentIds.filter((id) => id !== categoryId) : [...currentIds, categoryId],
        );
    };

    const removeCategory = (categoryId: number) => {
        const currentIds = watch("categoryIds") ?? [];
        setValue("categoryIds", currentIds.filter((id) => id !== categoryId));
    };

    const selectedCategories = categoryList.filter((cat) => selectedCategoryIds.includes(cat.id));

    const isPending = createProduct.isPending || updateProduct.isPending;
    const submitDisabled = isPending || isUploadingImages;
    const describedBy = (name: string, hasError: boolean) =>
        [hasError ? fid(`${name}-error`) : null, fid(`${name}-hint`)].filter(Boolean).join(" ");

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
            <Section
                title="Basic information"
                description="General details about the product including its name, category, and images."
            >
                <div className="col-span-2">
                    <label htmlFor={fid("name")} className={labelCls}>
                        Product name <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                        id={fid("name")}
                        {...register("name")}
                        placeholder="e.g. Wireless Headphones"
                        aria-required="true"
                        aria-invalid={!!errors.name}
                        aria-describedby={describedBy("name", !!errors.name)}
                        className={`mt-1 ${inputCls}`}
                    />
                    {errors.name && <p id={fid("name-error")} className={errorTextCls}>{errors.name.message}</p>}
                    <p id={fid("name-hint")} className={hintCls}>
                        The primary name of the product as it will appear in the catalog.
                    </p>

                    {!isEditing && (
                        <SimilarProductsPanel
                            searchName={watch("name") ?? ""}
                            onUseProduct={(product) => {
                                // Copy catalog details only. Stock is never copied:
                                // a new product starts with its own count.
                                setValue("description", product.description ?? "");
                                setValue("price", parseFloat(product.price));
                                setValue("costPrice", parseFloat(product.costPrice ?? "0"));
                                if (product.categoryId) setValue("categoryIds", [product.categoryId]);
                                setValue("sku", product.sku ?? "");
                                setValue("barcode", product.barcode ?? "");
                                setValue("image", product.image ?? "");
                                if (product.images) setValue("images", product.images);
                            }}
                        />
                    )}
                </div>

                <div className="col-span-2">
                    <label htmlFor={fid("description")} className={labelCls}>Description</label>
                    <textarea
                        id={fid("description")}
                        {...register("description")}
                        aria-describedby={fid("description-hint")}
                        placeholder="e.g. High-quality wireless headphones with noise cancellation and 30-hour battery life"
                        rows={4}
                        className={`mt-1 ${inputCls}`}
                    />
                    <p id={fid("description-hint")} className={hintCls}>
                        A detailed description of the product features and specifications.
                    </p>
                </div>

                <div className="col-span-2">
                    <span id={fid("categories-label")} className={labelCls}>Categories</span>

                    {selectedCategories.length > 0 && (
                        <ul aria-label="Selected categories" className="mt-2 flex flex-wrap gap-2">
                            {selectedCategories.map((category) => (
                                <li
                                    key={category.id}
                                    className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-primary-100)] py-1 pr-1 pl-3 text-sm font-medium text-[var(--brand-primary-800)] dark:bg-[var(--brand-primary-900)] dark:text-[var(--brand-primary-200)]"
                                >
                                    {category.name}
                                    <button
                                        type="button"
                                        onClick={() => removeCategory(category.id)}
                                        aria-label={`Remove category ${category.name}`}
                                        className="rounded-full p-1 hover:bg-[var(--brand-primary-200)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] focus-visible:outline-none dark:hover:bg-[var(--brand-primary-800)]"
                                    >
                                        <X className="h-3 w-3" aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div ref={categoryBoxRef} className="relative mt-2">
                        <div className="flex items-center gap-2">
                            <button
                                ref={categoryButtonRef}
                                type="button"
                                onClick={() => setIsCategoryDropdownOpen((o) => !o)}
                                disabled={categoriesLoading}
                                aria-haspopup="true"
                                aria-expanded={isCategoryDropdownOpen}
                                aria-controls={fid("categories-menu")}
                                aria-labelledby={`${fid("categories-label")} ${fid("categories-button-text")}`}
                                className={cn(inputCls, "flex items-center justify-between text-left")}
                            >
                                <span id={fid("categories-button-text")} className="text-gray-500 dark:text-gray-400">
                                    {categoriesLoading
                                        ? "Loading categories…"
                                        : selectedCategoryIds.length === 0
                                            ? "Select categories"
                                            : `${selectedCategoryIds.length} selected`}
                                </span>
                                <ChevronDown
                                    aria-hidden="true"
                                    className={`h-4 w-4 transition-transform ${isCategoryDropdownOpen ? "rotate-180" : ""}`}
                                />
                            </button>
                            <CreateCategoryDialog onCategoryCreated={handleCategoryCreated} />
                        </div>

                        {isCategoryDropdownOpen && (
                            <div
                                id={fid("categories-menu")}
                                role="group"
                                aria-labelledby={fid("categories-label")}
                                className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
                            >
                                {categoryList.length === 0 ? (
                                    <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                        No categories yet. Use + to create one.
                                    </p>
                                ) : (
                                    categoryList.map((category) => (
                                        <label
                                            key={category.id}
                                            className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedCategoryIds.includes(category.id)}
                                                onChange={() => toggleCategory(category.id)}
                                                className={checkboxCls}
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-200">{category.name}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {categoriesError && (
                        <p className={errorTextCls}>Error loading categories: {categoriesError.message}</p>
                    )}
                    <p className={hintCls}>Assign one or more categories for better organization and filtering.</p>
                </div>

                <div className="col-span-2">
                    <span className={labelCls}>Product images</span>
                    <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                        The first image (starred) is shown in listings. Use an image&apos;s star button to make it the
                        main image.
                    </p>
                    <MultiImageUpload
                        value={[
                            ...(watch("image") ? [watch("image")!] : []),
                            ...(watch("images") ?? []),
                        ].filter(Boolean)}
                        onChange={(urls) => {
                            const [primary, ...additional] = urls;
                            setValue("image", primary ?? "");
                            setValue("images", additional);
                        }}
                        onUploadingChange={setIsUploadingImages}
                    />
                    {errors.image && <p className={errorTextCls}>{errors.image.message}</p>}
                </div>
            </Section>

            <Section title="Identifiers" description="Codes used to uniquely identify and track this product.">
                <div>
                    <label htmlFor={fid("sku")} className={labelCls}>SKU (stock keeping unit)</label>
                    <input
                        id={fid("sku")}
                        {...register("sku")}
                        aria-describedby={fid("sku-hint")}
                        placeholder="e.g. HEAD-001"
                        className={`mt-1 ${inputCls}`}
                    />
                    <p id={fid("sku-hint")} className={hintCls}>A unique code for internal tracking.</p>
                </div>

                <div>
                    <label htmlFor={fid("barcode")} className={labelCls}>Barcode / UPC</label>
                    <input
                        id={fid("barcode")}
                        {...register("barcode")}
                        aria-describedby={fid("barcode-hint")}
                        placeholder="Scan or enter barcode"
                        className={`mt-1 ${inputCls}`}
                    />
                    <p id={fid("barcode-hint")} className={hintCls}>Scanned at the point of sale.</p>
                </div>
            </Section>

            <Section title="Pricing & inventory" description="Set the selling price, track costs, and manage stock levels.">
                <div>
                    <label htmlFor={fid("price")} className={labelCls}>
                        Selling price ({currency}) <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                        id={fid("price")}
                        type="number"
                        step="0.01"
                        min={0}
                        inputMode="decimal"
                        aria-required="true"
                        aria-invalid={!!errors.price}
                        aria-describedby={describedBy("price", !!errors.price)}
                        {...register("price", { valueAsNumber: true })}
                        className={`mt-1 ${inputCls}`}
                    />
                    {errors.price && <p id={fid("price-error")} className={errorTextCls}>{errors.price.message}</p>}
                    <p id={fid("price-hint")} className={hintCls}>The amount customers pay at checkout.</p>
                </div>

                <div>
                    <label htmlFor={fid("salePrice")} className={labelCls}>Sale price ({currency})</label>
                    <input
                        id={fid("salePrice")}
                        type="number"
                        step="0.01"
                        min={0}
                        inputMode="decimal"
                        aria-invalid={!!errors.salePrice}
                        aria-describedby={describedBy("salePrice", !!errors.salePrice)}
                        {...register("salePrice", { setValueAs: optionalNumberInput })}
                        placeholder="Leave empty for no sale"
                        className={`mt-1 ${inputCls}`}
                    />
                    {errors.salePrice && (
                        <p id={fid("salePrice-error")} className={errorTextCls}>{errors.salePrice.message}</p>
                    )}
                    {saleWarning && !errors.salePrice && (
                        <p role="status" className="mt-1 flex items-start gap-1.5 text-sm text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                            {saleWarning}
                        </p>
                    )}
                    <p id={fid("salePrice-hint")} className={hintCls}>Optional discounted price, lower than the selling price.</p>
                </div>

                <div>
                    <label htmlFor={fid("costPrice")} className={labelCls}>
                        Cost price ({currency}) <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                        id={fid("costPrice")}
                        type="number"
                        step="0.01"
                        min={0}
                        inputMode="decimal"
                        aria-required="true"
                        aria-invalid={!!errors.costPrice}
                        aria-describedby={describedBy("costPrice", !!errors.costPrice)}
                        {...register("costPrice", { valueAsNumber: true })}
                        className={`mt-1 ${inputCls}`}
                    />
                    {errors.costPrice && (
                        <p id={fid("costPrice-error")} className={errorTextCls}>{errors.costPrice.message}</p>
                    )}
                    <p id={fid("costPrice-hint")} className={hintCls}>Your cost to acquire the product. Used for profit.</p>
                </div>

                <div>
                    {isEditing && initialData ? (
                        <>
                            <span className={labelCls}>Current stock</span>
                            <div className="mt-1 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900">
                                <span className="text-sm font-semibold text-gray-900 tabular-nums dark:text-white">
                                    {stockQuantity < 0 ? "Untracked" : stockQuantity}
                                </span>
                                <AdjustStockButton
                                    productId={initialData.id}
                                    productName={initialData.name}
                                    stockQuantity={initialData.stockQuantity}
                                    showLabel
                                />
                            </div>
                            <p className={hintCls}>
                                Stock changes are recorded with a reason. Use Adjust stock to receive, remove or recount.
                            </p>
                        </>
                    ) : (
                        <>
                            <label htmlFor={fid("stockQuantity")} className={labelCls}>Opening stock</label>
                            <div className="mt-1 space-y-2">
                                <input
                                    id={fid("stockQuantity")}
                                    type="number"
                                    min={0}
                                    inputMode="numeric"
                                    aria-invalid={!!errors.stockQuantity}
                                    aria-describedby={describedBy("stockQuantity", !!errors.stockQuantity)}
                                    {...register("stockQuantity", { valueAsNumber: true })}
                                    disabled={formStock === -1}
                                    className={inputCls}
                                />
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formStock === -1}
                                        onChange={(e) => setValue("stockQuantity", e.target.checked ? -1 : 0)}
                                        className={checkboxCls}
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Quantity unknown</span>
                                </label>
                            </div>
                            {errors.stockQuantity && (
                                <p id={fid("stockQuantity-error")} className={errorTextCls}>{errors.stockQuantity.message}</p>
                            )}
                            <p id={fid("stockQuantity-hint")} className={hintCls}>
                                {formStock === -1
                                    ? "Untracked products are excluded from stock calculations."
                                    : "Quantity on hand right now."}
                            </p>
                        </>
                    )}
                </div>

                <div>
                    <label htmlFor={fid("lowStockThreshold")} className={labelCls}>Low stock threshold</label>
                    <input
                        id={fid("lowStockThreshold")}
                        type="number"
                        min={0}
                        inputMode="numeric"
                        aria-invalid={!!errors.lowStockThreshold}
                        aria-describedby={describedBy("lowStockThreshold", !!errors.lowStockThreshold)}
                        {...register("lowStockThreshold", { valueAsNumber: true })}
                        className={`mt-1 ${inputCls}`}
                    />
                    {errors.lowStockThreshold && (
                        <p id={fid("lowStockThreshold-error")} className={errorTextCls}>{errors.lowStockThreshold.message}</p>
                    )}
                    {thresholdWarning && !errors.lowStockThreshold && (
                        <p role="status" className="mt-1 flex items-start gap-1.5 text-sm text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                            {thresholdWarning}
                        </p>
                    )}
                    <p id={fid("lowStockThreshold-hint")} className={hintCls}>
                        The product shows as low stock once stock is at or below this number.
                    </p>
                </div>
            </Section>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
                {isUploadingImages && (
                    <p role="status" className="mr-auto text-sm text-gray-500 dark:text-gray-400">
                        Waiting for images to finish uploading…
                    </p>
                )}
                <Link href="/inventory/products" className={btnSecondary}>
                    Cancel
                </Link>
                <button type="submit" disabled={submitDisabled} className={btnPrimary}>
                    {isPending ? "Saving…" : isEditing ? "Save changes" : "Create product"}
                </button>
            </div>
        </form>
    );
}
