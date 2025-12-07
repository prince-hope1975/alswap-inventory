"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle, RefreshCw, Building2, Palette, Globe, Receipt, Phone, MapPin, Grid3x3 } from "lucide-react";
import { ImageUpload } from "~/app/_components/image-upload";
import { generateColorVariants } from "~/lib/color-utils";
import { ReceiptPreview } from "~/app/_components/pos/receipt-preview";
import { TemplateGalleryModal } from "./template-gallery-modal";
import { TEMPLATE_LIST } from "~/lib/receipt-templates";

const settingsSchema = z.object({
    name: z.string().min(1, "Company name is required"),
    brandColor: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color (e.g. #000000)")
        .optional(),
    primaryColorLight: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color (e.g. #9333EA)")
        .optional(),
    primaryColorDark: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color (e.g. #A855F7)")
        .optional(),
    logo: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    currency: z.string().max(10, "Currency code too long").optional(),
    location: z.string().max(255, "Location name too long").optional(),
    address: z.string().optional(),
    phone: z.string().max(50, "Phone number too long").optional(),
    receiptTemplate: z.string().max(50).optional(),
    receiptFooter: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const CURRENCIES = [
    { label: "Nigerian Naira (₦)", value: "₦" },
    { label: "US Dollar ($)", value: "$" },
    { label: "British Pound (£)", value: "£" },
    { label: "Euro (€)", value: "€" },
    { label: "Canadian Dollar (C$)", value: "C$" },
    { label: "Australian Dollar (A$)", value: "A$" },
    { label: "Japanese Yen (¥)", value: "¥" },
    { label: "Chinese Yuan (¥)", value: "¥" },
];

export default function SettingsPage() {
    const router = useRouter();
    const [isSaved, setIsSaved] = useState(false);
    const [showTemplateGallery, setShowTemplateGallery] = useState(false);

    const { data: settings, isLoading } = api.settings.getTenantSettings.useQuery();
    const utils = api.useUtils();
    const updateSettings = api.settings.updateTenantSettings.useMutation({
        onSuccess: () => {
            setIsSaved(true);
            void utils.settings.getTenantSettings.invalidate();
            router.refresh();
            setTimeout(() => setIsSaved(false), 3000);
        },
    });

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, isDirty },
    } = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            name: "",
            brandColor: "#000000",
            primaryColorLight: "#9333EA",
            primaryColorDark: "#A855F7",
            logo: "",
            currency: "₦",
            location: "",
            address: "",
            phone: "",
            receiptTemplate: "classic",
            receiptFooter: "Thank you for your business!",
        },
    });

    useEffect(() => {
        if (settings) {
            reset({
                name: settings.name,
                brandColor: settings.brandColor ?? "#000000",
                primaryColorLight: settings.primaryColorLight ?? "#9333EA",
                primaryColorDark: settings.primaryColorDark ?? "#A855F7",
                logo: settings.logo ?? "",
                currency: settings.currency ?? "₦",
                location: settings.location ?? "",
                address: settings.address ?? "",
                phone: settings.phone ?? "",
                receiptTemplate: settings.receiptTemplate ?? "classic",
                receiptFooter: settings.receiptFooter ?? "Thank you for your business!",
            });
        }
    }, [settings, reset]);

    const logoUrl = watch("logo");
    const brandColor = watch("brandColor");
    const primaryColorLight = watch("primaryColorLight");
    const primaryColorDark = watch("primaryColorDark");
    
    // Generate color variants for preview
    const lightVariants = primaryColorLight ? generateColorVariants(primaryColorLight) : {};
    const darkVariants = primaryColorDark ? generateColorVariants(primaryColorDark) : {};
    
    const onSubmit = (data: SettingsFormValues) => {
        updateSettings.mutate(data);
    };

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Settings
                </h1>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                    Manage your company profile, branding, and regional preferences.
                </p>
            </div>

            <div className="max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <form onSubmit={handleSubmit(onSubmit)} className="divide-y divide-gray-200 dark:divide-gray-700">
                    
                    {/* Company Details Section */}
                    <div className="p-6 md:p-8">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-primary-100)] text-[var(--brand-primary-600)] dark:bg-[var(--brand-primary-900)]/30 dark:text-[var(--brand-primary-400)]">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Company Details</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Basic information about your business.</p>
                            </div>
                        </div>
                        
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Company Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    {...register("name")}
                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-focus)]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    placeholder="e.g. Alswap Stores"
                                />
                                {errors.name && (
                                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Phone Number
                                </label>
                                <div className="relative mt-1">
                                    <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                    <input
                                        {...register("phone")}
                                        className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 shadow-sm transition-colors focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-focus)]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                        placeholder="+234 800 000 0000"
                                    />
                                </div>
                                {errors.phone && (
                                    <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Address
                                </label>
                                <div className="relative mt-1">
                                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                    <textarea
                                        {...register("address")}
                                        rows={3}
                                        className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 shadow-sm transition-colors focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-focus)]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                        placeholder="123 Store Street, City, Country"
                                    />
                                </div>
                                {errors.address && (
                                    <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Receipt Settings Section */}
                    <div className="p-6 md:p-8">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                <Receipt className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Receipt Settings</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Customize how your receipts look.</p>
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Receipt Template
                                </label>
                                <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    {[
                                        { id: "classic", name: "Classic", desc: "Simple list view" },
                                        { id: "modern", name: "Modern", desc: "Styled with logo" },
                                        { id: "thermal", name: "Thermal", desc: "Optimized for printers" },
                                    ].map((template) => (
                                        <label
                                            key={template.id}
                                            className={`relative flex cursor-pointer flex-col rounded-xl border p-4 shadow-sm focus:outline-none ${
                                                watch("receiptTemplate") === template.id
                                                    ? "border-[var(--brand-primary-500)] ring-2 ring-[var(--brand-primary-500)]"
                                                    : "border-gray-300 dark:border-gray-600"
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                {...register("receiptTemplate")}
                                                value={template.id}
                                                className="sr-only"
                                            />
                                            <span className="flex">
                                                <span className="flex flex-col">
                                                    <span className="block text-sm font-medium text-gray-900 dark:text-white">
                                                        {template.name}
                                                    </span>
                                                    <span className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                                                        {template.desc}
                                                    </span>
                                                </span>
                                            </span>
                                    <CheckCircle
                                        className={`absolute right-4 top-4 h-5 w-5 ${
                                            watch("receiptTemplate") === template.id
                                                ? "text-[var(--brand-primary-600)]"
                                                : "invisible"
                                        }`}
                                    />
                                    
                                    <div className="mt-1 flex-1 overflow-hidden rounded bg-gray-50 dark:bg-gray-900 pt-0 pb-1">
                                        <div className="scale-75 origin-top transform">
                                            <ReceiptPreview 
                                                template={template.id} 
                                                settings={{
                                                    name: watch("name"),
                                                    logo: watch("logo"),
                                                    address: watch("address"),
                                                    phone: watch("phone"),
                                                    receiptFooter: watch("receiptFooter")
                                                }}
                                                className="-mt-4 -mb-2"
                                            />
                                        </div>
                                    </div>
                                </label>
                            ))}
                                </div>
                                
                                {/* See More Templates Button */}
                                <div className="mt-4 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => setShowTemplateGallery(true)}
                                        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                    >
                                        <Grid3x3 className="h-4 w-4" />
                                        See More Templates ({TEMPLATE_LIST.length - 3} more)
                                    </button>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Receipt Footer Message
                                </label>
                                <textarea
                                    {...register("receiptFooter")}
                                    rows={2}
                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-focus)]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    placeholder="Thank you for your business!"
                                />
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Message displayed at the bottom of the receipt.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Branding Section */}
                    <div className="p-6 md:p-8">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                <Palette className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Branding</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Customize your brand colors for light and dark modes.</p>
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Primary Color (Light Mode)
                                </label>
                                <div className="mt-1 flex gap-3">
                                    <input
                                        type="color"
                                        value={primaryColorLight ?? "#9333EA"}
                                        onChange={(e) => {
                                            setValue("primaryColorLight", e.target.value, { shouldDirty: true });
                                        }}
                                        className="h-11 w-20 cursor-pointer rounded-lg border border-gray-300 p-1 dark:border-gray-600 dark:bg-gray-700"
                                    />
                                    <input
                                        {...register("primaryColorLight")}
                                        placeholder="#9333EA"
                                        className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-focus)]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                {errors.primaryColorLight && (
                                    <p className="mt-1 text-sm text-red-600">{errors.primaryColorLight.message}</p>
                                )}
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Main brand color used in light mode.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Primary Color (Dark Mode)
                                </label>
                                <div className="mt-1 flex gap-3">
                                    <input
                                        type="color"
                                        value={primaryColorDark ?? "#A855F7"}
                                        onChange={(e) => {
                                            setValue("primaryColorDark", e.target.value, { shouldDirty: true });
                                        }}
                                        className="h-11 w-20 cursor-pointer rounded-lg border border-gray-300 p-1 dark:border-gray-600 dark:bg-gray-700"
                                    />
                                    <input
                                        {...register("primaryColorDark")}
                                        placeholder="#A855F7"
                                        className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-focus)]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                {errors.primaryColorDark && (
                                    <p className="mt-1 text-sm text-red-600">{errors.primaryColorDark.message}</p>
                                )}
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Main brand color used in dark mode.
                                </p>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Color Preview
                                </label>
                                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Light Mode Variants</p>
                                            <div className="flex gap-1">
                                                {Object.entries(lightVariants).map(([variant, color]) => (
                                                    <div key={variant} className="flex-1">
                                                        <div
                                                            className="h-8 rounded border border-gray-200 dark:border-gray-700"
                                                            style={{ backgroundColor: color }}
                                                            title={`${variant}: ${color}`}
                                                        />
                                                        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">{variant}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Dark Mode Variants</p>
                                            <div className="flex gap-1">
                                                {Object.entries(darkVariants).map(([variant, color]) => (
                                                    <div key={variant} className="flex-1">
                                                        <div
                                                            className="h-8 rounded border border-gray-200 dark:border-gray-700"
                                                            style={{ backgroundColor: color }}
                                                            title={`${variant}: ${color}`}
                                                        />
                                                        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">{variant}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Brand Color (Legacy)
                                </label>
                                <div className="mt-1 flex gap-3">
                                    <input
                                        type="color"
                                        value={brandColor ?? "#000000"}
                                        onChange={(e) => {
                                            setValue("brandColor", e.target.value, { shouldDirty: true });
                                        }}
                                        className="h-11 w-20 cursor-pointer rounded-lg border border-gray-300 p-1 dark:border-gray-600 dark:bg-gray-700"
                                    />
                                    <input
                                        {...register("brandColor")}
                                        placeholder="#000000"
                                        className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-focus)]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                {errors.brandColor && (
                                    <p className="mt-1 text-sm text-red-600">{errors.brandColor.message}</p>
                                )}
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Legacy field for backward compatibility.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Logo
                                </label>
                                <div className="mt-1">
                                    <ImageUpload
                                        value={watch("logo") || ""}
                                        onChange={(url) => setValue("logo", url, { shouldDirty: true })}
                                    />
                                    {errors.logo && (
                                        <p className="mt-1 text-sm text-red-600">{errors.logo.message}</p>
                                    )}
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        Upload your company logo.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Regional Settings Section */}
                    <div className="p-6 md:p-8">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                <Globe className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Regional Settings</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Localization preferences for your store.</p>
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Currency Symbol
                                </label>
                                <select
                                    {...register("currency")}
                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-focus)]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                >
                                    {CURRENCIES.map((curr) => (
                                        <option key={curr.label} value={curr.value}>
                                            {curr.label}
                                        </option>
                                    ))}
                                    <option value="custom">Custom...</option>
                                </select>
                                {watch("currency") === "custom" && (
                                    <input
                                        {...register("currency")}
                                        placeholder="Enter symbol"
                                        className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    />
                                )}
                                {errors.currency && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.currency.message}
                                    </p>
                                )}
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Symbol displayed next to prices (e.g. ₦ for Naira).
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Store Location
                                </label>
                                <input
                                    {...register("location")}
                                    placeholder="e.g. Lagos Branch"
                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-focus)]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                                {errors.location && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.location.message}
                                    </p>
                                )}
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Used on receipts and reports.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-4 bg-gray-50 px-6 py-4 dark:bg-gray-800/50 md:px-8">
                        {isSaved && (
                            <span className="flex items-center gap-2 text-sm font-medium text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                Saved successfully
                            </span>
                        )}
                        <button
                            type="submit"
                            disabled={updateSettings.isPending || !isDirty}
                            className="rounded-lg bg-[var(--brand-primary-600)] px-8 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--brand-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-focus)] focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900"
                        >
                            {updateSettings.isPending ? "Saving Changes..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Template Gallery Modal */}
            <TemplateGalleryModal
                isOpen={showTemplateGallery}
                onClose={() => setShowTemplateGallery(false)}
                currentTemplate={watch("receiptTemplate") || "classic"}
                onSelectTemplate={(templateId) => {
                    setValue("receiptTemplate", templateId, { shouldDirty: true });
                }}
                settings={{
                    name: watch("name"),
                    logo: watch("logo"),
                    address: watch("address"),
                    phone: watch("phone"),
                    receiptFooter: watch("receiptFooter"),
                }}
            />
        </div>
    );
}
