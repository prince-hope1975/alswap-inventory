import { describe, expect, it } from "vitest";

import { activeNavHref, canSeeNavItem, groupNavItems, type NavSection } from "./staff-nav";

describe("canSeeNavItem", () => {
  it("shows everything to admins", () => {
    expect(canSeeNavItem("/inventory/settings", "ADMIN")).toBe(true);
    expect(canSeeNavItem("/inventory/users", "ADMIN")).toBe(true);
  });

  it("hides ADMIN-only links from managers", () => {
    for (const href of [
      "/inventory/users",
      "/inventory/settings",
      "/inventory/settings/store",
      "/inventory/reviews",
      "/inventory/articles",
    ]) {
      expect(canSeeNavItem(href, "MANAGER")).toBe(false);
    }
    for (const href of ["/inventory", "/inventory/products", "/inventory/orders", "/inventory/demand", "/pos"]) {
      expect(canSeeNavItem(href, "MANAGER")).toBe(true);
    }
  });

  it("limits cashiers to POS and sales", () => {
    expect(canSeeNavItem("/pos", "CASHIER")).toBe(true);
    expect(canSeeNavItem("/sales/history", "CASHIER")).toBe(true);
    expect(canSeeNavItem("/inventory/customers", "CASHIER")).toBe(false);
    expect(canSeeNavItem("/inventory", "CASHIER")).toBe(false);
    expect(canSeeNavItem("/inventory/products", "CASHIER")).toBe(false);
  });

  it("does not confuse look-alike prefixes", () => {
    expect(canSeeNavItem("/inventory/usersettings", "MANAGER")).toBe(true);
  });
});

describe("activeNavHref", () => {
  const hrefs = ["/inventory", "/inventory/products", "/inventory/settings", "/inventory/settings/store"];

  it("picks the dashboard only on the dashboard", () => {
    expect(activeNavHref("/inventory", hrefs)).toBe("/inventory");
  });

  it("prefix-matches nested pages to their section", () => {
    expect(activeNavHref("/inventory/products/new", hrefs)).toBe("/inventory/products");
    expect(activeNavHref("/inventory/products/abc123", hrefs)).toBe("/inventory/products");
  });

  it("prefers the longest match", () => {
    expect(activeNavHref("/inventory/settings/store", hrefs)).toBe("/inventory/settings/store");
    expect(activeNavHref("/inventory/settings", hrefs)).toBe("/inventory/settings");
  });

  it("returns null when nothing matches", () => {
    expect(activeNavHref("/pos", hrefs)).toBeNull();
  });
});

describe("groupNavItems", () => {
  const items: { href: string; section: NavSection }[] = [
    { href: "/inventory", section: "Overview" },
    { href: "/pos", section: "Sales" },
    { href: "/inventory/products", section: "Catalog" },
    { href: "/inventory/categories", section: "Catalog" },
    { href: "/inventory/settings", section: "Admin" },
  ];

  it("orders sections and keeps item order inside them", () => {
    const groups = groupNavItems(items);
    expect(groups.map((g) => g.section)).toEqual(["Overview", "Catalog", "Sales", "Admin"]);
    expect(groups[1]!.items.map((i) => i.href)).toEqual(["/inventory/products", "/inventory/categories"]);
  });

  it("drops sections a role cannot see", () => {
    const cashier = items.filter((i) => canSeeNavItem(i.href, "CASHIER"));
    expect(groupNavItems(cashier).map((g) => g.section)).toEqual(["Sales"]);
  });
});
