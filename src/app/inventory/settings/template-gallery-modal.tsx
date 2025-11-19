"use client";

import { useState } from "react";
import { X, Search, CheckCircle } from "lucide-react";
import { TEMPLATE_LIST, type ReceiptTemplate } from "~/lib/receipt-templates";
import { ReceiptPreview } from "~/app/_components/pos/receipt-preview";
import { cn } from "~/lib/utils";

interface TemplateGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentTemplate: string;
    onSelectTemplate: (templateId: string) => void;
    settings: {
        name: string;
        logo?: string | null;
        address?: string;
        phone?: string;
        receiptFooter?: string;
    };
}

export function TemplateGalleryModal({
    isOpen,
    onClose,
    currentTemplate,
    onSelectTemplate,
    settings,
}: TemplateGalleryModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<"all" | "compact" | "full">("all");

    if (!isOpen) return null;

    const filteredTemplates = TEMPLATE_LIST.filter((template) => {
        const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             template.description.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (filter === "compact") {
            return matchesSearch && (template.renderType === "thermal" || template.renderType === "grid" || template.id === "compact_list");
        }
        if (filter === "full") {
            return matchesSearch && (template.renderType === "card" || template.renderType === "standard" || template.renderType === "minimal");
        }
        return matchesSearch;
    });

    const handleSelect = (templateId: string) => {
        onSelectTemplate(templateId);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-800">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Choose Receipt Template</h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Select from {TEMPLATE_LIST.length} professional templates
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <X className="h-6 w-6 text-gray-500" />
                    </button>
                </div>

                {/* Search and Filter */}
                <div className="border-b border-gray-200 p-4 dark:border-gray-800">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search templates..."
                                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-focus)]/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            />
                        </div>
                        <div className="flex gap-2">
                            {(["all", "compact", "full"] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={cn(
                                        "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                                        filter === f
                                            ? "bg-[var(--brand-primary-600)] text-white"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                    )}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Template Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {filteredTemplates.length === 0 ? (
                        <div className="flex h-64 items-center justify-center text-gray-500">
                            <p>No templates found matching your search.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredTemplates.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => handleSelect(template.id)}
                                    className={cn(
                                        "group relative flex flex-col overflow-hidden rounded-xl border-2 transition-all hover:shadow-lg",
                                        currentTemplate === template.id
                                            ? "border-[var(--brand-primary-500)] ring-2 ring-[var(--brand-primary-500)]"
                                            : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                                    )}
                                >
                                    {/* Selected Indicator */}
                                    {currentTemplate === template.id && (
                                        <div className="absolute right-2 top-2 z-10 rounded-full bg-[var(--brand-primary-600)] p-1.5 text-white shadow-lg">
                                            <CheckCircle className="h-4 w-4" />
                                        </div>
                                    )}

                                    {/* Template Preview */}
                                    <div className="bg-gray-50 p-4 dark:bg-gray-800">
                                        <div className=" origin-top-left transform" >
                                            <ReceiptPreview
                                                template={template.id}
                                                settings={settings}
                                                className="ring-0" // Remove ring for nested preview
                                            />
                                        </div>
                                    </div>

                                    {/* Template Info */}
                                    <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{template.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-4 dark:border-gray-800">
                    <div className="flex justify-end">
                        <button
                            onClick={onClose}
                            className="rounded-lg bg-gray-100 px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

