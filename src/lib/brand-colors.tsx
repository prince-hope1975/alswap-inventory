"use client";

import { useEffect } from "react";
import { api } from "~/trpc/react";
import { generateBrandColorCSS } from "./color-utils";

/**
 * Client component that injects CSS variables for brand colors
 * Updates dynamically when settings change
 */
export function BrandColorProvider({ children }: { children: React.ReactNode }) {
    const { data: settings } = api.settings.getTenantSettings.useQuery(undefined, {
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
        refetchOnWindowFocus: true,
    });

    useEffect(() => {
        if (!settings) return;

        const primaryLight = settings.primaryColorLight ?? "#9333EA";
        const primaryDark = settings.primaryColorDark ?? "#A855F7";

        // Generate CSS string
        const css = generateBrandColorCSS(primaryLight, primaryDark);

        // Find or create style element
        let styleElement = document.getElementById("brand-colors-styles");
        if (!styleElement) {
            styleElement = document.createElement("style");
            styleElement.id = "brand-colors-styles";
            document.head.appendChild(styleElement);
        }

        // Update CSS
        styleElement.textContent = css;
    }, [settings]);

    return <>{children}</>;
}

