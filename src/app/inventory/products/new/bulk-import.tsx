"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { toast } from "~/lib/toast";

interface ParsedProduct {
    name: string;
    description?: string;
    costPrice: number;
    price: number;
    stockQuantity: number;
    sku?: string;
    barcode?: string;
    categoryId?: number;
    lowStockThreshold: number;
    duplicateStatus?: "new" | "duplicate_csv" | "duplicate_db";
    duplicateId?: string; // ID of existing product if duplicate
    action?: "create" | "merge" | "skip";
}

interface BulkImportProps {
    categories: { id: number; name: string }[];
}

export function BulkImport({ categories }: BulkImportProps) {
    const router = useRouter();
    const { currency } = useCurrency();
    const [csvText, setCsvText] = useState("");
    const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
    const [showTable, setShowTable] = useState(false);
    const [parseError, setParseError] = useState("");

    const bulkCreate = api.inventory.bulkCreateProducts.useMutation({
        onSuccess: (data) => {
            toast.success(`Successfully created ${data?.length || 0} products!`);
            router.push("/inventory/products");
            router.refresh();
        },
        onError: (error) => {
            toast.error(`Failed to create products: ${error.message}`);
        },
    });

    const mergeProduct = api.inventory.mergeProduct.useMutation({
        onError: (error) => {
            toast.error(`Failed to merge product: ${error.message}`);
        },
    });

    const checkDuplicates = api.inventory.checkDuplicatesMutation.useMutation({
        onError: (error) => {
            toast.error(`Failed to check duplicates: ${error.message}`);
        },
    });

    const parseCSV = (text: string): ParsedProduct[] => {
        const lines = text.trim().split("\n");
        if (lines.length < 2) {
            throw new Error("CSV must have at least a header row and one data row");
        }

        const headers = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
        const products: ParsedProduct[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i]!.trim();
            if (!line) continue;

            const values = line.split(",").map((v) => v.trim());
            const product: ParsedProduct = {
                name: "",
                costPrice: 0,
                price: 0,
                stockQuantity: 0,
                lowStockThreshold: 5,
            };

            headers.forEach((header, index) => {
                const value = values[index] || "";

                if (header.includes("name") || header.includes("product")) {
                    product.name = value;
                } else if (header.includes("description")) {
                    product.description = value;
                } else if (header.includes("cost") && header.includes("price")) {
                    product.costPrice = parseFloat(value) || 0;
                } else if (header.includes("selling") || header.includes("price")) {
                    product.price = parseFloat(value) || 0;
                } else if (header.includes("quantity") || header.includes("stock")) {
                    // Empty or blank = unknown (-1), otherwise parse as number
                    product.stockQuantity = value.trim() === "" ? -1 : (parseInt(value) || 0);
                } else if (header.includes("sku")) {
                    product.sku = value;
                } else if (header.includes("barcode")) {
                    product.barcode = value;
                } else if (header.includes("threshold")) {
                    product.lowStockThreshold = parseInt(value) || 5;
                }
            });

            if (product.name) {
                products.push(product);
            }
        }

        return products;
    };

    const handleParse = async () => {
        try {
            setParseError("");
            const products = parseCSV(csvText);
            if (products.length === 0) {
                setParseError("No valid products found in CSV");
                toast.error("No valid products found in CSV");
                return;
            }

            toast.info(`Parsing ${products.length} products...`);

            // Check for duplicates within CSV
            const nameCount: Record<string, number> = {};
            products.forEach(p => {
                const normalizedName = p.name.toLowerCase().trim();
                nameCount[normalizedName] = (nameCount[normalizedName] || 0) + 1;
            });

            // Mark CSV duplicates
            const seenNames = new Set<string>();
            products.forEach(p => {
                const normalizedName = p.name.toLowerCase().trim();
                if (seenNames.has(normalizedName)) {
                    p.duplicateStatus = "duplicate_csv";
                    p.action = "skip";
                } else {
                    seenNames.add(normalizedName);
                    p.duplicateStatus = "new";
                    p.action = "create";
                }
            });

            // Check against database
            const names = products.map(p => p.name);
            const dbDuplicates = await checkDuplicates.mutateAsync({ names });

            products.forEach(p => {
                if (dbDuplicates[p.name]) {
                    p.duplicateStatus = "duplicate_db";
                    p.duplicateId = dbDuplicates[p.name]!.id;
                    p.action = "merge"; // Default to merge for DB duplicates
                }
            });

            const csvDupes = products.filter(p => p.duplicateStatus === "duplicate_csv").length;
            const dbDupes = products.filter(p => p.duplicateStatus === "duplicate_db").length;

            if (csvDupes > 0 || dbDupes > 0) {
                toast.warning(`Found ${csvDupes} CSV duplicates and ${dbDupes} existing products`);
            } else {
                toast.success("All products are new!");
            }

            setParsedProducts(products);
            setShowTable(true);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to parse CSV";
            setParseError(errorMessage);
            toast.error(errorMessage);
        }
    };

    const handleImport = async () => {
        try {
            const toCreate = parsedProducts.filter(p => p.action === "create" && p.duplicateStatus !== "duplicate_csv");
            const toMerge = parsedProducts.filter(p => p.action === "merge" && p.duplicateId);
            const toSkip = parsedProducts.filter(p => p.action === "skip");

            toast.info(`Importing: ${toCreate.length} new, ${toMerge.length} merges, ${toSkip.length} skipped`);

            // Merge products first
            let mergedCount = 0;
            for (const product of toMerge) {
                try {
                    await mergeProduct.mutateAsync({
                        existingId: product.duplicateId!,
                        newData: {
                            price: product.price,
                            costPrice: product.costPrice,
                            stockQuantity: product.stockQuantity,
                            description: product.description,
                            sku: product.sku,
                            barcode: product.barcode,
                        },
                        mergeStrategy: "add_stock",
                    });
                    mergedCount++;
                } catch (error) {
                    console.error(`Failed to merge ${product.name}:`, error);
                    // Continue with other products
                }
            }

            // Create new products
            if (toCreate.length > 0) {
                await bulkCreate.mutateAsync({ products: toCreate });
            }

            if (mergedCount > 0) {
                toast.success(`Merged ${mergedCount} products successfully!`);
            }

            router.push("/inventory/products");
            router.refresh();
        } catch (error) {
            toast.error(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    };

    const updateProduct = (index: number, field: keyof ParsedProduct, value: any) => {
        const updated = [...parsedProducts];
        updated[index] = { ...updated[index]!, [field]: value };
        setParsedProducts(updated);
    };

    const removeProduct = (index: number) => {
        setParsedProducts(parsedProducts.filter((_, i) => i !== index));
    };

    if (showTable) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            Review Products ({parsedProducts.length})
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Review and edit the products before importing
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setShowTable(false);
                            setParsedProducts([]);
                        }}
                        className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    >
                        ← Back to CSV
                    </button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Product Name
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Cost ({currency})
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Price ({currency})
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Stock
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    SKU
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Action
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Remove
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                            {parsedProducts.map((product, index) => (
                                <tr key={index} className={product.duplicateStatus !== "new" ? "bg-yellow-50 dark:bg-yellow-900/10" : ""}>
                                    <td className="px-4 py-3">
                                        {product.duplicateStatus === "new" && (
                                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                                                ✓ New
                                            </span>
                                        )}
                                        {product.duplicateStatus === "duplicate_csv" && (
                                            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                                ⚠️ Duplicate in CSV
                                            </span>
                                        )}
                                        {product.duplicateStatus === "duplicate_db" && (
                                            <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                                ⚠️ Exists in DB
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="text"
                                            value={product.name}
                                            onChange={(e) => updateProduct(index, "name", e.target.value)}
                                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            value={product.costPrice}
                                            onChange={(e) => updateProduct(index, "costPrice", parseFloat(e.target.value) || 0)}
                                            className="w-24 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            value={product.price}
                                            onChange={(e) => updateProduct(index, "price", parseFloat(e.target.value) || 0)}
                                            className="w-24 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        {product.stockQuantity === -1 ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm italic text-gray-500 dark:text-gray-400">Unknown</span>
                                                <button
                                                    onClick={() => updateProduct(index, "stockQuantity", 0)}
                                                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                                                >
                                                    Set Value
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={product.stockQuantity}
                                                    onChange={(e) => updateProduct(index, "stockQuantity", parseInt(e.target.value) || 0)}
                                                    className="w-20 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                                />
                                                <button
                                                    onClick={() => updateProduct(index, "stockQuantity", -1)}
                                                    className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400"
                                                >
                                                    Unknown
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="text"
                                            value={product.sku || ""}
                                            onChange={(e) => updateProduct(index, "sku", e.target.value)}
                                            className="w-24 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={product.action || "create"}
                                            onChange={(e) => updateProduct(index, "action", e.target.value as "create" | "merge" | "skip")}
                                            className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                            disabled={product.duplicateStatus === "duplicate_csv"}
                                        >
                                            <option value="create">Create New</option>
                                            {product.duplicateStatus === "duplicate_db" && (
                                                <option value="merge">Merge</option>
                                            )}
                                            <option value="skip">Skip</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => removeProduct(index)}
                                            className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end gap-4">
                    <button
                        onClick={() => router.back()}
                        className="rounded-md border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={bulkCreate.isPending || parsedProducts.length === 0}
                        className="rounded-md bg-[var(--brand-primary-600)] px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--brand-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-focus)] focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900"
                    >
                        {bulkCreate.isPending ? "Importing..." : `Import ${parsedProducts.length} Products`}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Bulk Import Products</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Paste your CSV data below. The first row should contain column headers.
                </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">Expected CSV Format:</h4>
                <div className="rounded bg-white p-3 font-mono text-xs dark:bg-gray-900">
                    <div className="text-gray-600 dark:text-gray-400">
                        Product Name,Cost Price,Selling Price,Quantity,SKU,Barcode,Description
                    </div>
                    <div className="text-gray-800 dark:text-gray-200">
                        WIRE 1mm KING SMART 2C RU,5400,12500,10,SKU001,,High quality wire
                    </div>
                    <div className="text-gray-800 dark:text-gray-200">
                        TV HANGER Medium,2300,6200,5,SKU002,,Durable TV mount
                    </div>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Note: Only Product Name, Cost Price, Selling Price, and Quantity are required. Other fields are optional.
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Paste CSV Data
                </label>
                <textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    rows={10}
                    placeholder="Product Name,Cost Price,Selling Price,Quantity&#10;WIRE 1mm KING SMART 2C RU,5400,12500,10&#10;TV HANGER Medium,2300,6200,5"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-[var(--brand-primary-focus)] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                {parseError && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{parseError}</p>
                )}
            </div>

            <div className="flex justify-end gap-4">
                <button
                    onClick={() => router.back()}
                    className="rounded-md border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                    Cancel
                </button>
                <button
                    onClick={handleParse}
                    disabled={!csvText.trim()}
                    className="rounded-md bg-[var(--brand-primary-600)] px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--brand-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-focus)] focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900"
                >
                    Parse & Review
                </button>
            </div>
        </div>
    );
}
