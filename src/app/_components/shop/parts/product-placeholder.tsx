import {
  BatteryCharging,
  Cable,
  Fan,
  Lightbulb,
  Package,
  Plug,
  Sun,
  Tv,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICON_RULES: [RegExp, LucideIcon][] = [
  [/solar|panel/i, Sun],
  [/batter/i, BatteryCharging],
  [/inverter|power|generator|stabili[sz]er|ups|breaker|mcb|fuse/i, Zap],
  [/cable|wire|cord/i, Cable],
  [/bulb|lamp|light|led/i, Lightbulb],
  [/socket|plug|switch|adapter|extension/i, Plug],
  [/fan|cool/i, Fan],
  [/tool|drill|tester|meter/i, Wrench],
  [/tv|television|electronic|phone|speaker|audio/i, Tv],
];

/** Department icon for a product with no photo, guessed from category/name. */
export function placeholderIcon(...hints: (string | null | undefined)[]): LucideIcon {
  const text = hints.filter(Boolean).join(" ");
  return ICON_RULES.find(([pattern]) => pattern.test(text))?.[1] ?? Package;
}

/**
 * Branded tile shown instead of a grey "no photo" box: a department icon on a
 * soft brand wash, with the category name, so photo-less items still read as
 * part of the catalogue.
 */
export function ProductPlaceholder({
  name,
  category,
  size = "md",
}: {
  name: string;
  category?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = placeholderIcon(category, name);
  const iconSize = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-6 w-6" : "h-10 w-10";
  return (
    <span
      aria-hidden
      className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#e3eef2] to-[#f3efe4] text-[#0b6e99] dark:from-[#112b3c] dark:to-[#0f1a22] dark:text-[#8dc5dc]"
    >
      <span className="grid place-items-center rounded-2xl bg-white/70 p-3 shadow-sm dark:bg-white/5">
        <Icon className={iconSize} strokeWidth={1.5} />
      </span>
      {size !== "sm" && category && (
        <span className="max-w-[85%] truncate text-[11px] font-semibold tracking-wide text-[#41515c] uppercase dark:text-gray-400">
          {category}
        </span>
      )}
    </span>
  );
}
