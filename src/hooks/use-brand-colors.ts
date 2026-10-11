import { useMemo } from "react";

import { api } from "~/trpc/react";
import { generateColorVariants } from "~/lib/color-utils";

/**
 * Hook to access brand colors and utilities. Uses the public shop query so it
 * works for anonymous shoppers and every staff role (the admin settings query
 * 401s for them).
 */
export function useBrandColors() {
    const { data } = api.shop.getShopDetails.useQuery(undefined, {
        staleTime: 1000 * 60 * 5,
        retry: false,
    });

    const primaryLight = data?.tenant?.primaryColorLight ?? "#9333EA";
    const primaryDark = data?.tenant?.primaryColorDark ?? "#A855F7";
    const colorVariants = useMemo(
        () => ({
            light: generateColorVariants(primaryLight),
            dark: generateColorVariants(primaryDark),
        }),
        [primaryLight, primaryDark],
    );

    return { primaryLight, primaryDark, colorVariants };
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

