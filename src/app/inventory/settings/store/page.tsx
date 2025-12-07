"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle, RefreshCw, LayoutTemplate, Palette, Globe, ShieldCheck, ExternalLink, Moon, Sun, Monitor } from "lucide-react";
import Link from "next/link";
import type { StoreConfig } from "~/types/store-config";

// Schema matching the one in settings router
const storeSettingsSchema = z.object({
    template: z.enum(["modern", "classic", "marketplace"]),
    themeMode: z.enum(["system", "light", "dark"]),
    showHero: z.boolean(),
    showArticles: z.boolean(),
    primaryColor: z.string().optional(),
});

type StoreSettingsFormValues = z.infer<typeof storeSettingsSchema>;

export default function StoreSettingsPage() {
    const router = useRouter();
    const [isSaved, setIsSaved] = useState(false);

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
                });
            }
        }
    }, [settings, reset]);

    const onSubmit = (data: StoreSettingsFormValues) => {
        updateSettings.mutate({
            name: settings?.name || "", // Name is required by mutation but strictly read-only here
            storeConfig: data,
        });
    };

    const currentTemplate = watch("template");
    const currentTheme = watch("themeMode");

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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                                {/* Custom Color Override (Optional) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Store Primary Color (Optional)
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            {...register("primaryColor")}
                                            className="h-10 w-14 rounded cursor-pointer border border-gray-300 p-1"
                                        />
                                        <div className="flex-1">
                                            <input
                                                {...register("primaryColor")}
                                                placeholder="Use default brand color"
                                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Overrides the global brand color for the store only.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

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
