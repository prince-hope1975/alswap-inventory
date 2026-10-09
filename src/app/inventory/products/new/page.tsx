"use client";

import { use, useState } from "react";
import { api } from "~/trpc/react";
import { ProductForm } from "./product-form";
import { BulkImport } from "./bulk-import";
import { ErrorBoundary } from "~/components/error-boundary";
import { ComponentErrorFallback } from "~/components/route-error-boundary";
import { Tabs } from "~/components/ui/tabs";
import { ProductsBackLink } from "../back-link";

export default function NewProductPage(props: {
    searchParams: Promise<{ name?: string | string[] }>;
}) {
    const { name } = use(props.searchParams);
    const rawName = (Array.isArray(name) ? name[0] : name)?.trim().slice(0, 255);
    const defaultName = rawName?.length ? rawName : undefined;
    const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
    const { data: categories = [] } = api.inventory.listCategories.useQuery();

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <ProductsBackLink current="Add products" />
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Add products</h1>
                <p className="text-gray-500 dark:text-gray-400">
                    Create products individually or import multiple products at once.
                </p>
            </div>

            <Tabs
                label="How to add products"
                items={[
                    { key: "single", label: "Single product" },
                    { key: "bulk", label: "Bulk import" },
                ]}
                value={activeTab}
                onChange={setActiveTab}
            >
                {activeTab === "single" ? (
                    <ErrorBoundary
                        componentName="ProductForm"
                        fallback={<ComponentErrorFallback title="Form Error" message="Failed to load product form" />}
                    >
                        <ProductForm categories={categories} defaultName={defaultName} />
                    </ErrorBoundary>
                ) : (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <ErrorBoundary
                            componentName="BulkImport"
                            fallback={<ComponentErrorFallback title="Import Error" message="Failed to load bulk import tool" />}
                        >
                            <BulkImport categories={categories} />
                        </ErrorBoundary>
                    </div>
                )}
            </Tabs>
        </div>
    );
}
