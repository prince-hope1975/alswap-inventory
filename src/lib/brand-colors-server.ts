import { generateBrandColorCSS } from "./color-utils";

/**
 * Server-side function to generate CSS string for brand colors
 * Used for SSR and initial page load
 */
export function getBrandColorStyles(
    primaryLight: string = "#9333EA",
    primaryDark: string = "#A855F7"
): string {
    return generateBrandColorCSS(primaryLight, primaryDark);
}

