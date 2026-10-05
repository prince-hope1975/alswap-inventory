/**
 * Title and description copy for product and category pages.
 *
 * Nigerian shoppers search "<product> price in nigeria" far more than the bare
 * product name (Google Trends, Delta State, 2026), so pages that show a price
 * say so in the title, and descriptions lead with the real price and stock
 * state. Everything here is derived from catalogue data; nothing is claimed
 * that the page itself does not show.
 */

export const META_DESCRIPTION_MAX = 155;

/** The price the page displays, honouring a sale price; null when none is shown. */
export function shownPrice(price: string | number, salePrice?: string | number | null): number | null {
  const sale = salePrice == null ? null : Number(salePrice);
  const value = sale != null && Number.isFinite(sale) && sale >= 0 ? sale : Number(price);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function formatPrice(currency: string | null | undefined, value: number) {
  return `${currency ?? "₦"}${value.toLocaleString("en-NG")}`;
}

/** Same rule as the storefront: -1 means not stock-tracked, i.e. available. */
export function isAvailable(stockQuantity: number) {
  return stockQuantity === -1 || stockQuantity > 0;
}

/** Blank descriptions count as missing, so they fall back like null ones. */
function nonEmpty(text: string | null | undefined) {
  const trimmed = text?.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Cuts at a word boundary so snippets never end mid-word. */
export function truncate(text: string, max = META_DESCRIPTION_MAX) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}

export function productMetaTitle(name: string, price: number | null, location?: string | null) {
  if (price == null) return name;
  return location ? `${name} Price in ${location}` : `${name} Price`;
}

export function productMetaDescription(input: {
  name: string;
  price: number | null;
  currency?: string | null;
  available: boolean;
  storeName: string;
  location?: string | null;
  description?: string | null;
}) {
  const where = input.location ? `${input.storeName}, ${input.location}` : input.storeName;
  const lead =
    input.price != null
      ? `${input.name}: ${formatPrice(input.currency, input.price)} at ${where}. ${
          input.available ? "In stock" : "Currently out of stock"
        }.`
      : `${input.name} at ${where}. Ask for current price and availability.`;
  const body = nonEmpty(input.description) ?? "Pickup or delivery options available on enquiry.";
  return truncate(`${lead} ${body}`);
}

export function categoryMetaTitle(name: string, location?: string | null) {
  return location ? `${name} Prices in ${location}` : `${name} Prices`;
}

export function categoryMetaDescription(input: {
  name: string;
  productCount: number;
  minPrice: number | null;
  currency?: string | null;
  storeName: string;
  description?: string | null;
}) {
  const body =
    nonEmpty(input.description) ??
    `Browse ${input.name.toLowerCase()} available from ${input.storeName}. Check current prices, stock and pickup or delivery options.`;
  if (input.productCount === 0) return truncate(body);
  const items = `${input.productCount} ${input.productCount === 1 ? "item" : "items"}`;
  const from = input.minPrice != null ? ` from ${formatPrice(input.currency, input.minPrice)}` : "";
  return truncate(`${items}${from}. ${body}`);
}
