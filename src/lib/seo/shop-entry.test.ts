import { describe, it, expect } from "vitest";
import { shopEntryHref } from "./host";
describe("shop entry", () => {
  it("uses each custom domain's shop surface", () => {
    expect(shopEntryHref("www.sppdamaks.com", true)).toBe(
      "https://shop.sppdamaks.com/",
    );
    expect(shopEntryHref("other-store.com", true)).toBe(
      "https://shop.other-store.com/",
    );
    expect(shopEntryHref("shop.sppdamaks.com", true)).toBe(
      "https://shop.sppdamaks.com/",
    );
  });
  it("keeps development and previews relative", () => {
    for (const host of [
      "localhost:3010",
      "shop.localhost:3010",
      "127.0.0.1:3010",
      "preview.vercel.app",
    ])
      expect(shopEntryHref(host, true)).toBe("/shop");
    expect(shopEntryHref("sppdamaks.com", false)).toBe("/shop");
  });
});
