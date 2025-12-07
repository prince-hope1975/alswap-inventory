/**
 * Color utility functions for generating brand color variants
 * and CSS custom properties
 */

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1]!, 16),
              g: parseInt(result[2]!, 16),
              b: parseInt(result[3]!, 16),
          }
        : null;
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
    return `#${[r, g, b].map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
    }).join("")}`;
}

/**
 * Lighten a color by a percentage
 */
export function lightenColor(hex: string, amount: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount));
    const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount));
    const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount));

    return rgbToHex(r, g, b);
}

/**
 * Darken a color by a percentage
 */
export function darkenColor(hex: string, amount: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const r = Math.max(0, Math.round(rgb.r * (1 - amount)));
    const g = Math.max(0, Math.round(rgb.g * (1 - amount)));
    const b = Math.max(0, Math.round(rgb.b * (1 - amount)));

    return rgbToHex(r, g, b);
}

/**
 * Generate Tailwind-like color scale (50-900) from a base color
 * The base color is positioned at 600 in the scale
 */
export function generateColorVariants(hexColor: string): Record<string, string> {
    const variants: Record<string, string> = {};

    // Generate lighter variants (50-500)
    variants["50"] = lightenColor(hexColor, 0.95);
    variants["100"] = lightenColor(hexColor, 0.9);
    variants["200"] = lightenColor(hexColor, 0.75);
    variants["300"] = lightenColor(hexColor, 0.6);
    variants["400"] = lightenColor(hexColor, 0.4);
    variants["500"] = lightenColor(hexColor, 0.2);

    // Base color at 600
    variants["600"] = hexColor;

    // Generate darker variants (700-900)
    variants["700"] = darkenColor(hexColor, 0.15);
    variants["800"] = darkenColor(hexColor, 0.3);
    variants["900"] = darkenColor(hexColor, 0.45);

    return variants;
}

/**
 * Generate CSS custom properties for brand colors
 */
export function generateCSSVariables(
    primaryLight: string,
    primaryDark: string
): Record<string, string> {
    const lightVariants = generateColorVariants(primaryLight);
    const darkVariants = generateColorVariants(primaryDark);

    const variables: Record<string, string> = {};

    // Light mode variants
    Object.entries(lightVariants).forEach(([variant, color]) => {
        variables[`--brand-primary-light-${variant}`] = color;
    });

    // Dark mode variants
    Object.entries(darkVariants).forEach(([variant, color]) => {
        variables[`--brand-primary-dark-${variant}`] = color;
    });

    // Current mode defaults (will be set by CSS based on dark mode class)
    variables["--brand-primary"] = `var(--brand-primary-light-600)`;
    variables["--brand-primary-50"] = `var(--brand-primary-light-50)`;
    variables["--brand-primary-100"] = `var(--brand-primary-light-100)`;
    variables["--brand-primary-200"] = `var(--brand-primary-light-200)`;
    variables["--brand-primary-300"] = `var(--brand-primary-light-300)`;
    variables["--brand-primary-400"] = `var(--brand-primary-light-400)`;
    variables["--brand-primary-500"] = `var(--brand-primary-light-500)`;
    variables["--brand-primary-600"] = `var(--brand-primary-light-600)`;
    variables["--brand-primary-700"] = `var(--brand-primary-light-700)`;
    variables["--brand-primary-800"] = `var(--brand-primary-light-800)`;
    variables["--brand-primary-900"] = `var(--brand-primary-light-900)`;

    // Hover and focus states
    variables["--brand-primary-hover"] = `var(--brand-primary-light-700)`;
    variables["--brand-primary-focus"] = `var(--brand-primary-light-500)`;

    // Gradient colors (using primary as both for now, can be customized later)
    variables["--brand-gradient-from"] = primaryLight;
    variables["--brand-gradient-to"] = lightenColor(primaryLight, 0.3);

    return variables;
}

/**
 * Convert CSS variables object to CSS string
 */
export function cssVariablesToString(variables: Record<string, string>): string {
    return Object.entries(variables)
        .map(([key, value]) => `${key}: ${value};`)
        .join("\n  ");
}

/**
 * Generate complete CSS string for brand colors
 */
export function generateBrandColorCSS(primaryLight: string, primaryDark: string): string {
    const variables = generateCSSVariables(primaryLight, primaryDark);
    const cssVars = cssVariablesToString(variables);

    return `
:root {
  ${cssVars}
}

.dark {
  --brand-primary: var(--brand-primary-dark-600);
  --brand-primary-50: var(--brand-primary-dark-50);
  --brand-primary-100: var(--brand-primary-dark-100);
  --brand-primary-200: var(--brand-primary-dark-200);
  --brand-primary-300: var(--brand-primary-dark-300);
  --brand-primary-400: var(--brand-primary-dark-400);
  --brand-primary-500: var(--brand-primary-dark-500);
  --brand-primary-600: var(--brand-primary-dark-600);
  --brand-primary-700: var(--brand-primary-dark-700);
  --brand-primary-800: var(--brand-primary-dark-800);
  --brand-primary-900: var(--brand-primary-dark-900);
  --brand-primary-hover: var(--brand-primary-dark-700);
  --brand-primary-focus: var(--brand-primary-dark-500);
  --brand-gradient-from: ${primaryDark};
  --brand-gradient-to: ${lightenColor(primaryDark, 0.3)};
}
`.trim();
}




