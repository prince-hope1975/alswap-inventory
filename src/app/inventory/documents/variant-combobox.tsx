"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "~/lib/utils";
import { inputCls } from "~/components/ui/styles";

export type VariantOption = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  productName: string;
};

const MAX_RESULTS = 50;

export function variantLabel(v: VariantOption) {
  const variant = v.name && v.name !== "Default" ? ` – ${v.name}` : "";
  return `${v.productName}${variant}`;
}

/** Case-insensitive match on product name, variant name, SKU or barcode. */
export function filterVariants(options: readonly VariantOption[], query: string, limit = MAX_RESULTS) {
  const q = query.trim().toLowerCase();
  const matches = q
    ? options.filter((o) =>
        [o.productName, o.name, o.sku ?? "", o.barcode ?? ""].some((field) => field.toLowerCase().includes(q)),
      )
    : options;
  return matches.slice(0, limit);
}

/**
 * Searchable product picker (WAI-ARIA combobox with a listbox popup).
 * Type to filter, arrows to move, Enter to choose, Esc to close.
 */
export function VariantCombobox({
  options,
  value,
  onChange,
  label,
  loading = false,
}: {
  options: readonly VariantOption[];
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  /** Accessible name, e.g. "Line 2 product match". */
  label: string;
  loading?: boolean;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const selected = options.find((o) => o.id === value);
  const results = useMemo(() => filterVariants(options, query), [options, query]);

  const choose = (id: string | undefined) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      const option = results[active];
      if (option) choose(option.id);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      setQuery("");
    }
  };

  const activeId = open && results[active] ? `${listId}-opt-${results[active].id}` : undefined;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        placeholder={loading ? "Loading products…" : "Search products…"}
        value={open ? query : selected ? variantLabel(selected) : ""}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Let an option's mousedown run first.
          setTimeout(() => {
            setOpen(false);
            setQuery("");
          }, 120);
        }}
        onKeyDown={onKeyDown}
        className={cn(inputCls, "min-h-10 pr-8")}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-gray-400"
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute z-20 mt-1 max-h-64 w-full min-w-64 overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          {value && (
            <li
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(undefined);
              }}
              className="cursor-pointer px-3 py-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Clear match
            </li>
          )}
          {results.length === 0 ? (
            <li className="px-3 py-2 text-gray-500 dark:text-gray-400">No products match.</li>
          ) : (
            results.map((o, i) => (
              <li
                key={o.id}
                id={`${listId}-opt-${o.id}`}
                role="option"
                aria-selected={o.id === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(o.id);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-gray-800 dark:text-gray-100",
                  i === active && "bg-[var(--brand-primary-50)] dark:bg-gray-700",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate">{variantLabel(o)}</span>
                  {o.sku && <span className="block text-xs text-gray-500 dark:text-gray-400">SKU {o.sku}</span>}
                </span>
                {o.id === value && <Check className="h-4 w-4 shrink-0 text-[var(--brand-primary-600)]" aria-hidden="true" />}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
