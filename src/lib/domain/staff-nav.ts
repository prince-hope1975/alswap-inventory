/**
 * Which staff dashboard links a role may see. Mirrors the server gates:
 * - middleware blocks MANAGER from /inventory/settings* and /inventory/users,
 *   and limits CASHIER to /pos, /sales and /inventory/customers (the last is
 *   not linked: crm is manager-only);
 * - the reviews and articles routers are ADMIN-only.
 */

const ADMIN_ONLY_PREFIXES = [
  "/inventory/users",
  "/inventory/settings",
  "/inventory/reviews",
  "/inventory/articles",
];

// Middleware also lets cashiers open /inventory/customers, but the crm router
// is manager-only, so linking it would lead to an error page.
const CASHIER_PREFIXES = ["/pos", "/sales"];

function matchesPrefix(href: string, prefix: string) {
  return href === prefix || href.startsWith(`${prefix}/`);
}

export function canSeeNavItem(href: string, role: string | null | undefined) {
  if (role === "ADMIN") return true;
  if (role === "MANAGER") return !ADMIN_ONLY_PREFIXES.some((p) => matchesPrefix(href, p));
  if (role === "CASHIER") return CASHIER_PREFIXES.some((p) => matchesPrefix(href, p));
  return false;
}

export function isManagerRole(role: string | null | undefined) {
  return role === "ADMIN" || role === "MANAGER";
}

/**
 * The nav href that should render as active for `pathname`: the longest href
 * that equals the path or is a path-segment prefix of it. "/inventory" would
 * otherwise prefix-match every page, and "/inventory/settings" would light up
 * on "/inventory/settings/store".
 */
export function activeNavHref(pathname: string, hrefs: readonly string[]) {
  let best: string | null = null;
  for (const href of hrefs) {
    if (!matchesPrefix(pathname, href)) continue;
    if (!best || href.length > best.length) best = href;
  }
  return best;
}
