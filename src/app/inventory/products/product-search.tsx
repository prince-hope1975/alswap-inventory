"use client";

import { Search, Filter } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { useScanDetection } from "~/hooks/use-scan-detection";

export function ProductSearch() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [value, setValue] = useState(searchParams.get("search") ?? "");
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleSearch = useCallback(
        (term: string) => {
            const params = new URLSearchParams(searchParams);
            if (term) {
                params.set("search", term);
            } else {
                params.delete("search");
            }
            startTransition(() => {
                router.replace(`/inventory/products?${params.toString()}`);
            });
        },
        [router, searchParams]
    );

    const handleChange = (term: string) => {
        setValue(term);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            handleSearch(term);
        }, 300);
    };

    useScanDetection({
        onScan: (code) => {
            setValue(code);
            handleSearch(code);
        },
    });

    return (
        <div className="flex items-center gap-4 rounded-lg border bg-white p-4 dark:bg-gray-800">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder="Search products by name, SKU, or scan barcode..."
                    className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-[var(--brand-primary-500)] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                {isPending && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--brand-primary-600)] border-t-transparent"></div>
                    </div>
                )}
            </div>
            <button className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
                <Filter className="h-4 w-4" />
                Filter
            </button>
        </div>
    );
}

