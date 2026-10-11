"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "~/lib/utils";

export type TabItem<K extends string> = { key: K; label: ReactNode };

/** Index the arrow/Home/End key moves to in a row of `count` tabs, or null. */
export function nextTabIndex(key: string, current: number, count: number): number | null {
  if (count <= 0) return null;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

/**
 * WAI-ARIA tabs with automatic activation: role=tablist/tab/tabpanel,
 * aria-selected, roving tabindex and arrow/Home/End keys.
 */
export function Tabs<K extends string>({
  items,
  value,
  onChange,
  label,
  children,
  className,
}: {
  items: readonly TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Accessible name for the tab list. */
  label: string;
  /** The active panel's content. */
  children: ReactNode;
  className?: string;
}) {
  const baseId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = Math.max(0, items.findIndex((i) => i.key === value));

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const next = nextTabIndex(e.key, activeIndex, items.length);
    if (next === null) return;
    e.preventDefault();
    onChange(items[next]!.key);
    refs.current[next]?.focus();
  };

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        className="flex gap-2 overflow-x-auto border-b border-gray-200 dark:border-gray-700"
      >
        {items.map((item, i) => {
          const selected = i === activeIndex;
          return (
            <button
              key={item.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.key}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.key)}
              onKeyDown={onKeyDown}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:rounded-t-lg focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] focus-visible:outline-none",
                selected
                  ? "border-[var(--brand-primary-600)] text-[var(--brand-primary-700)] dark:text-[var(--brand-primary-400)]"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${items[activeIndex]?.key}`}
        className="pt-6"
      >
        {children}
      </div>
    </div>
  );
}
