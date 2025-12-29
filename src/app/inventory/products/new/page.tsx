"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { ProductForm } from "./product-form";
import { BulkImport } from "./bulk-import";
import { ErrorBoundary } from "~/components/error-boundary";
import { ComponentErrorFallback } from "~/components/route-error-boundary";

export default function NewProductPage() {
    const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
    const { data: categories = [] } = api.inventory.listCategories.useQuery();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Add Products
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                    Create products individually or import multiple products at once.
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab("single")}
                        className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${activeTab === "single"
                            ? "border-[var(--brand-primary-600)] text-[var(--brand-primary-600)]"
                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            }`}
                    >
                        Single Product
                    </button>
                    <button
                        onClick={() => setActiveTab("bulk")}
                        className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${activeTab === "bulk"
                            ? "border-[var(--brand-primary-600)] text-[var(--brand-primary-600)]"
                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            }`}
                    >
                        Bulk Import
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-800">
                {activeTab === "single" ? (
                    <ErrorBoundary
                        componentName="ProductForm"
                        fallback={<ComponentErrorFallback title="Form Error" message="Failed to load product form" />}
                    >
                        <ProductForm categories={categories} />
                    </ErrorBoundary>
                ) : (
                    <ErrorBoundary
                        componentName="BulkImport"
                        fallback={<ComponentErrorFallback title="Import Error" message="Failed to load bulk import tool" />}
                    >
                        <BulkImport categories={categories} />
                    </ErrorBoundary>
                )}
            </div>
        </div>
    );
}
