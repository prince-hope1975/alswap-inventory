/**
 * Shared Tailwind class strings for the staff dashboard so every field and
 * button has the same focus ring, radius and colours.
 */

const focusRing =
  "focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] focus-visible:outline-none";

/** Text inputs, selects and textareas. */
export const inputCls =
  "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--brand-primary-500)] focus:ring-2 focus:ring-[var(--brand-primary-focus)] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:disabled:bg-gray-800";

export const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300";
export const hintCls = "mt-1 text-xs text-gray-500 dark:text-gray-400";
export const errorTextCls = "mt-1 text-sm text-red-600 dark:text-red-400";

export const checkboxCls =
  "h-4 w-4 rounded border-gray-300 text-[var(--brand-primary-600)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] dark:border-gray-600 dark:bg-gray-700";

const btnBase = `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

export const btnPrimary = `${btnBase} bg-[var(--brand-primary-600)] text-white shadow-sm hover:bg-[var(--brand-primary-hover)]`;
export const btnSecondary = `${btnBase} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700`;
export const btnDanger = `${btnBase} bg-red-600 text-white shadow-sm hover:bg-red-500`;
export const btnGhost = `${btnBase} text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800`;

/** Square icon-only button (always pair with aria-label). */
export const iconBtn = `inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${focusRing}`;

/** Clickable table rows / list items that receive keyboard focus. */
// Outline (not box-shadow ring) because box-shadow on <tr> is unreliable.
export const rowFocus =
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--brand-primary-focus)]";

export const cardCls =
  "rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800";
