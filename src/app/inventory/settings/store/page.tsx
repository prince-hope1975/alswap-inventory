"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle, RefreshCw, LayoutTemplate, Palette, Globe, ShieldCheck, ExternalLink, Moon, Sun, Monitor, MapPin, CreditCard, Truck } from "lucide-react";
import Link from "next/link";
import type { StoreConfig } from "~/types/store-config";
import { LocationPicker } from "~/app/_components/maps/location-picker";

// Schema matching the one in settings router
const storeSettingsSchema = z.object({
    template: z.enum(["modern", "classic", "marketplace", "minimal", "boutique", "conversion"]),
    themeMode: z.enum(["system", "light", "dark"]),
    showHero: z.boolean(),
    showArticles: z.boolean(),
    primaryColor: z.string().optional(),
    heroTitle: z.string().optional(),
    heroDescription: z.string().optional(),
    deliveryFee: z.coerce.number().min(0).optional(),
    pickupLocationName: z.string().max(255).optional(),
    pickupAddress: z.string().optional(),
    pickupLat: z.coerce.number().min(-90).max(90).optional(),
    pickupLng: z.coerce.number().min(-180).max(180).optional(),
    paystackPublicKey: z.string().optional(),
});

type StoreSettingsFormValues = z.infer<typeof storeSettingsSchema>;

export default function StoreSettingsPage() {
    const router = useRouter();
    const [isSaved, setIsSaved] = useState(false);
    const [paystackSecretKey, setPaystackSecretKey] = useState("");

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
        setValue,
        watch,
        reset,
        formState: { isDirty },
    } = useForm<StoreSettingsFormValues>({
        resolver: zodResolver(storeSettingsSchema),
        defaultValues: {
            template: "modern",
            themeMode: "system",
            showHero: true,
            showArticles: false,
        },
    });

    // Load initial data
    useEffect(() => {
        if (settings) {
            // Drizzle might return the JSON object directly
            const config = settings.storeConfig as StoreConfig;
            if (config) {
                reset({
                    template: config.template || "modern",
                    themeMode: config.themeMode || "system",
                    showHero: config.showHero ?? true,
                    showArticles: config.showArticles ?? false,
                    primaryColor: config.primaryColor || "",
                    heroTitle: config.heroTitle || "",
                    heroDescription: config.heroDescription || "",
                    deliveryFee: config.deliveryFee ?? 0,
                    pickupLocationName: settings.location ?? "",
                    pickupAddress: settings.address ?? "",
                    pickupLat: settings.latitude ? Number(settings.latitude) : undefined,
                    pickupLng: settings.longitude ? Number(settings.longitude) : undefined,
                    paystackPublicKey: settings.paystackPublicKey ?? "",
                });
            }
        }
    }, [settings, reset]);

    const onSubmit = (data: StoreSettingsFormValues) => {
        const {
            pickupLocationName,
            pickupAddress,
            pickupLat,
            pickupLng,
            paystackPublicKey,
            deliveryFee,
            ...storeConfigFields
        } = data;

        updateSettings.mutate({
            name: settings?.name || "", // Name is required by mutation but strictly read-only here
            location: pickupLocationName || undefined,
            address: pickupAddress || undefined,
            latitude: pickupLat == null ? undefined : pickupLat,
            longitude: pickupLng == null ? undefined : pickupLng,
            paystackPublicKey: paystackPublicKey || undefined,
            paystackSecretKey: paystackSecretKey.trim() ? paystackSecretKey.trim() : undefined,
            storeConfig: {
                ...storeConfigFields,
                deliveryFee,
            },
        });
    };

    const currentTemplate = watch("template");
    const currentTheme = watch("themeMode");
    const pickupLat = watch("pickupLat");
    const pickupLng = watch("pickupLng");
    const pickupAddress = watch("pickupAddress");

    const mapValue = useMemo(() => {
        if (pickupLat == null || pickupLng == null || Number.isNaN(Number(pickupLat)) || Number.isNaN(Number(pickupLng))) return null;
        return { lat: Number(pickupLat), lng: Number(pickupLng), address: pickupAddress || undefined };
    }, [pickupAddress, pickupLat, pickupLng]);

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Store Customization
                    </h1>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                        Design your public storefront, choose templates, and manage themes.
                    </p>
                </div>
                <Link
                    href="/"
                    target="_blank"
                    className="flex items-center gap-2 rounded-lg bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                    <ExternalLink className="h-4 w-4" />
                    View Store
                </Link>
            </div>

            <div className="max-w-5xl">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

                    {/* Pickup Location */}
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    <MapPin className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pickup Location</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Set where customers should pick up reserved orders.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Location name
                                    </label>
                                    <input
                                        type="text"
                                        {...register("pickupLocationName")}
                                        placeholder="e.g., Main Branch, Ikeja"
                                        className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-purple-500 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Pickup address (auto-filled)
                                    </label>
                                    <textarea
                                        rows={2}
                                        {...register("pickupAddress")}
                                        placeholder="Will auto-fill when you pick a point"
                                        className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-purple-500 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                    />
                                </div>
                            </div>

                            <LocationPicker
                                value={mapValue}
                                onChange={(next) => {
                                    setValue("pickupLat", next.lat, { shouldDirty: true });
                                    setValue("pickupLng", next.lng, { shouldDirty: true });
                                    if (next.address) setValue("pickupAddress", next.address, { shouldDirty: true });
                                }}
                            />

                            {/* hidden coords to keep RHF aware */}
                            <input type="hidden" {...register("pickupLat")} />
                            <input type="hidden" {...register("pickupLng")} />
                        </div>
                    </div>

                    {/* Checkout & Payments */}
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                    <CreditCard className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Checkout & Payments</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Delivery fee and Paystack configuration (per store).
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Delivery fee
                                    </label>
                                    <div className="relative">
                                        <Truck className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <input
                                            type="number"
                                            step="1"
                                            min="0"
                                            {...register("deliveryFee")}
                                            className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-purple-500 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                            placeholder="e.g., 1500"
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        Added to the order total when customers choose delivery.
                                    </p>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Paystack public key
                                    </label>
                                    <input
                                        type="text"
                                        {...register("paystackPublicKey")}
                                        placeholder="pk_live_..."
                                        className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-purple-500 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Paystack secret key (stored encrypted)
                                </label>
                                <input
                                    type="password"
                                    value={paystackSecretKey}
                                    onChange={(e) => setPaystackSecretKey(e.target.value)}
                                    placeholder={settings?.hasPaystackSecretKey ? "•••••••••••• (already set)" : "sk_live_..."}
                                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-purple-500 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                />
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Leave blank to keep existing. To clear, remove and save (we’ll add a dedicated “Clear key” later if you want).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Templates Section */}
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                    <LayoutTemplate className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Store Template</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Select the structural layout for your ecommerce store.</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 md:p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                    {
                                        id: "modern",
                                        name: "Modern",
                                        desc: "Clean, minimalist design with large imagery. Best for lifestyle brands.",
                                        color: "bg-gradient-to-br from-gray-900 to-gray-800"
                                    },
                                    {
                                        id: "classic",
                                        name: "Classic",
                                        desc: "Information-dense layout with persistent sidebar. Best for large catalogs.",
                                        color: "bg-[#232f3e]"
                                    },
                                    {
                                        id: "marketplace",
                                        name: "Marketplace",
                                        desc: "Bright, energetic layout with sliders and deal sections. Best for retail.",
                                        color: "bg-orange-600"
                                    },
                                    {
                                        id: "minimal",
                                        name: "Minimalist",
                                        desc: "Clean, whitespace-driven design with large typography. Best for luxury.",
                                        color: "bg-stone-100 border border-stone-300 !text-stone-800"
                                    },
                                    {
                                        id: "boutique",
                                        name: "Boutique",
                                        desc: "Elegant, serif-focused masonry grid. Best for fashion and curated items.",
                                        color: "bg-[#fcfbf9] border border-stone-200 !text-stone-800"
                                    },
                                    {
                                        id: "conversion",
                                        name: "Conversion",
                                        desc: "Sales-optimized layout with urgency elements, trust signals, and prominent CTAs. Best for promotions.",
                                        color: "bg-gradient-to-br from-orange-500 to-red-600"
                                    },
                                ].map((template) => (
                                    <label
                                        key={template.id}
                                        className={`relative cursor-pointer group rounded-xl border-2 transition-all duration-200 overflow-hidden ${currentTemplate === template.id
                                            ? "border-purple-600 ring-4 ring-purple-600/10"
                                            : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700"
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            {...register("template")}
                                            value={template.id}
                                            className="sr-only"
                                        />
                                        <div className={`h-32 w-full ${template.color} flex items-center justify-center text-white p-4`}>
                                            {/* Mock UI Preview */}
                                            <div className="w-full h-full opacity-50 flex flex-col gap-2">
                                                <div className="w-full h-4 bg-white/20 rounded-full" />
                                                <div className="flex gap-2 h-full">
                                                    {template.id === 'classic' && <div className="w-1/4 h-full bg-white/20 rounded" />}
                                                    <div className="flex-1 bg-white/10 rounded border border-white/10" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-white dark:bg-gray-800">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-gray-900 dark:text-white">{template.name}</span>
                                                {currentTemplate === template.id && (
                                                    <CheckCircle className="h-5 w-5 text-purple-600" fill="currentColor" stroke="white" />
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">
                                                {template.desc}
                                            </p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Appearance & Toggles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                        <Palette className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Control the look and feel.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        Theme Mode
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { value: "light", label: "Light", icon: Sun },
                                            { value: "dark", label: "Dark", icon: Moon },
                                            { value: "system", label: "System", icon: Monitor },
                                        ].map((mode) => (
                                            <label
                                                key={mode.value}
                                                className={`cursor-pointer flex flex-col items-center justify-center rounded-lg border p-3 transition-colors ${currentTheme === mode.value
                                                    ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-300"
                                                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    {...register("themeMode")}
                                                    value={mode.value}
                                                    className="sr-only"
                                                />
                                                <mode.icon className="h-5 w-5 mb-2" />
                                                <span className="text-xs font-medium">{mode.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Primary Color Picker */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                                        Brand Color
                                    </label>
                                    <div className="flex gap-3">
                                        <input
                                            type="color"
                                            {...register("primaryColor")}
                                            className="h-10 w-20 rounded border border-gray-300 p-1"
                                        />
                                        <div className="text-xs text-gray-500 max-w-xs">
                                            Select your brand's primary color. This will be used for buttons, highlights, and accents across your store.
                                        </div>
                                    </div>
                                </div>

                                {/* Hero Content Settings */}
                                <div className="space-y-4 border-t pt-4 dark:border-gray-700">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Hero Content</h3>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Hero Title
                                        </label>
                                        <input
                                            type="text"
                                            {...register("heroTitle")}
                                            placeholder="e.g., Essentials for modern living"
                                            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-purple-500 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-purple-500 dark:focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Hero Description
                                        </label>
                                        <textarea
                                            {...register("heroDescription")}
                                            rows={3}
                                            placeholder="e.g., Curated items for your everyday life. Simple, functional, and beautiful."
                                            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-purple-500 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-purple-500 dark:focus:ring-purple-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Features Section */}
                        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                        <Globe className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Features</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Toggle storefront sections.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <div>
                                        <span className="block text-sm font-medium text-gray-900 dark:text-white">Show Hero Section</span>
                                        <span className="block text-xs text-gray-500 dark:text-gray-400">Display the large welcome banner/slider on the homepage.</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" {...register("showHero")} />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                                    </label>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <div>
                                        <span className="block text-sm font-medium text-gray-900 dark:text-white">Show Articles/Blog</span>
                                        <span className="block text-xs text-gray-500 dark:text-gray-400">Enable the articles section (Coming Soon).</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" {...register("showArticles")} />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300 md:left-64">
                        <div className="container mx-auto max-w-5xl p-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={updateSettings.isPending || !isDirty}
                                className={`
                                    flex items-center gap-2 rounded-xl px-8 py-4 font-bold text-white shadow-xl transition-all 
                                    ${updateSettings.isPending || !isDirty
                                        ? "bg-gray-400 cursor-not-allowed opacity-50"
                                        : "bg-purple-600 hover:bg-purple-700 hover:scale-[1.02] shadow-purple-500/25"}
                                `}
                            >
                                {updateSettings.isPending ? "Saving Changes..." : "Save Configuration"}
                                {isSaved && <CheckCircle className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
}
