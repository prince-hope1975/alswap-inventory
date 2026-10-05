"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useScanDetection } from "~/hooks/use-scan-detection";

import { inputCls } from "~/components/ui/styles";
import { cn } from "~/lib/utils";

const selectCls = cn(inputCls, "h-10 py-0 lg:w-auto");

export function ProductSearch({ categories }: { categories: { id: number; name: string }[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [value, setValue] = useState(searchParams.get("search") ?? "");
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const urlSearch = searchParams.get("search") ?? "";

    // Follow external URL changes (e.g. "Clear filters") without fighting the
    // user while they type.
    useEffect(() => {
        if (document.activeElement !== inputRef.current) setValue(urlSearch);
    }, [urlSearch]);

    useEffect(() => () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, []);

    /** Updates one URL param; any filter change returns to page 1. */
    const setParam = useCallback(
        (key: string, next: string | null) => {
            const params = new URLSearchParams(searchParams);
            if (next) params.set(key, next);
            else params.delete(key);
            params.delete("page");
            const qs = params.toString();
            startTransition(() => {
                router.replace(`/inventory/products${qs ? `?${qs}` : ""}`);
            });
        },
        [router, searchParams]
    );

    const handleChange = (term: string) => {
        setValue(term);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setParam("search", term.trim() || null), 300);
    };

    useScanDetection({
        onScan: (code) => {
            setValue(code);
            setParam("search", code);
        },
    });

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 lg:flex-row lg:items-center dark:border-gray-700 dark:bg-gray-800">
            <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <input
                    ref={inputRef}
                    type="search"
                    value={value}
                    onChange={(e) => handleChange(e.target.value)}
                    aria-label="Search products"
                    placeholder="Search by name, SKU, or scan barcode..."
                    className={`${inputCls} h-10 pr-10 pl-10`}
                />
                {isPending && (
                    <div className="absolute top-1/2 right-3 -translate-y-1/2" aria-hidden="true">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--brand-primary-600)] border-t-transparent"></div>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex">
                <select
                    aria-label="Stock level"
                    value={searchParams.get("stock") ?? ""}
                    onChange={(e) => setParam("stock", e.target.value || null)}
                    className={selectCls}
                >
                    <option value="">All stock</option>
                    <option value="low">Low stock</option>
                    <option value="out">Out of stock</option>
                    <option value="untracked">Untracked</option>
                </select>
                <select
                    aria-label="Category"
                    value={searchParams.get("category") ?? ""}
                    onChange={(e) => setParam("category", e.target.value || null)}
                    className={selectCls}
                >
                    <option value="">All categories</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
                <select
                    aria-label="Images"
                    value={searchParams.get("hasImage") ?? ""}
                    onChange={(e) => setParam("hasImage", e.target.value || null)}
                    className={selectCls}
                >
                    <option value="">Any image</option>
                    <option value="true">With images</option>
                    <option value="false">Without images</option>
                </select>
                <select
                    aria-label="Sort"
                    value={searchParams.get("sort") ?? "newest"}
                    onChange={(e) => setParam("sort", e.target.value === "newest" ? null : e.target.value)}
                    className={selectCls}
                >
                    <option value="newest">Newest first</option>
                    <option value="name">Name A–Z</option>
                    <option value="stock-asc">Stock: low to high</option>
                    <option value="stock-desc">Stock: high to low</option>
                    <option value="price-asc">Price: low to high</option>
                    <option value="price-desc">Price: high to low</option>
                </select>
            </div>
        </div>
    );
}
