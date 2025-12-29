"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { useCurrency } from "~/hooks/use-tenant-settings";

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
        onSuccess: () => {
            router.push("/inventory/products");
            router.refresh();
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
                    product.stockQuantity = parseInt(value) || 0;
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

    const handleParse = () => {
        try {
            setParseError("");
            const products = parseCSV(csvText);
            if (products.length === 0) {
                setParseError("No valid products found in CSV");
                return;
            }
            setParsedProducts(products);
            setShowTable(true);
        } catch (error) {
            setParseError(error instanceof Error ? error.message : "Failed to parse CSV");
        }
    };

    const handleImport = () => {
        bulkCreate.mutate({ products: parsedProducts });
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
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                            {parsedProducts.map((product, index) => (
                                <tr key={index}>
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
                                        <input
                                            type="number"
                                            value={product.stockQuantity}
                                            onChange={(e) => updateProduct(index, "stockQuantity", parseInt(e.target.value) || 0)}
                                            className="w-20 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                        />
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
