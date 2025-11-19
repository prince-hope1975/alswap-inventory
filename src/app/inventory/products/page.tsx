import Link from "next/link";
import { Plus } from "lucide-react";
import { api, HydrateClient } from "~/trpc/server";

import { ProductActions } from "./product-actions";
import { ProductSearch } from "./product-search";

export default async function ProductsPage(props: {
    searchParams: Promise<{ search?: string }>;
}) {
    const searchParams = await props.searchParams;
    const products = await api.inventory.listProducts({ search: searchParams.search });

    return (
        <HydrateClient>
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Products
                    </h1>
                    <Link
                        href="/inventory/products/new"
                        className="flex items-center justify-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                    >
                        <Plus className="h-4 w-4" />
                        Add Product
                    </Link>
                </div>

                <ProductSearch />

                <div className="overflow-hidden rounded-lg border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    SKU / Barcode
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Category
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Price
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Stock
                                </th>
                                <th className="relative px-6 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                            {products.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                                    >
                                        {searchParams.search
                                            ? "No products found matching your search."
                                            : "No products found. Add your first product to get started."}
                                    </td>
                                </tr>
                            ) : (
                                products.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {product.name}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            <div className="flex flex-col">
                                                <span>{product.sku ?? "-"}</span>
                                                <span className="text-xs text-gray-400">{product.barcode}</span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {product.category?.name ?? "Uncategorized"}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                            ${Number(product.price).toFixed(2)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span
                                                className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${product.stockQuantity <= (product.lowStockThreshold ?? 5)
                                                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                                    : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                    }`}
                                            >
                                                {product.stockQuantity} in stock
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                            <ProductActions id={product.id} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </HydrateClient>
    );
}
