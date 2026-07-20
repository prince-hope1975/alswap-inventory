export function createSlug(value: string) {
  return value
    .replace(/[\u00b2\u00b3\u00b9\u2070-\u2079]/g, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}
