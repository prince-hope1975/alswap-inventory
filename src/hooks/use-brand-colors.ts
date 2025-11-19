import { api } from "~/trpc/react";

/**
 * Hook to access brand colors and utilities
 */
export function useBrandColors() {
    const { data: settings } = api.settings.getTenantSettings.useQuery(undefined, {
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });

    const primaryLight = settings?.primaryColorLight ?? "#9333EA";
    const primaryDark = settings?.primaryColorDark ?? "#A855F7";

    return {
        primaryLight,
        primaryDark,
        colorVariants: settings?.colorVariants,
    };
}

/**
 * Get Tailwind-compatible class names for brand colors
 * Uses CSS variables that are dynamically injected
 */
export function getBrandColorClass(
    variant: "50" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" = "600"
): string {
    return `bg-[var(--brand-primary-${variant})]`;
}

/**
 * Get text color class for brand colors
 */
export function getBrandTextColorClass(
    variant: "50" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" = "600"
): string {
    return `text-[var(--brand-primary-${variant})]`;
}

/**
 * Get border color class for brand colors
 */
export function getBrandBorderColorClass(
    variant: "50" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" = "600"
): string {
    return `border-[var(--brand-primary-${variant})]`;
}

/**
 * Get ring color class for brand colors (for focus states)
 */
export function getBrandRingColorClass(): string {
    return `ring-[var(--brand-primary-focus)]`;
}

/**
 * Get gradient classes using brand colors
 */
export function getBrandGradientClasses(): string {
    return `bg-gradient-to-r from-[var(--brand-gradient-from)] to-[var(--brand-gradient-to)]`;
}

