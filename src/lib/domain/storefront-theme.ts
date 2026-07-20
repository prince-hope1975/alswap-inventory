export const ELECTRICAL_STOREFRONT_COLORS = {
  navy: "#112b3c",
  blue: "#0b6e99",
  amber: "#f5a623",
  warmWhite: "#f6f4ee",
} as const;

type StorefrontTheme = "light" | "dark" | "system";

export function resolveStorefrontTheme(configured: StorefrontTheme, stored: string | null) {
  if (stored === "light" || stored === "dark") return stored;
  if (configured === "light" || configured === "dark") return configured;
  return "light";
}
