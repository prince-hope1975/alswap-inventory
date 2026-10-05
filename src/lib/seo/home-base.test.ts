import { describe, expect, it } from "vitest";

import { homeBaseUrlFromHost } from "./host";

describe("homeBaseUrlFromHost", () => {
  it("collapses every surface onto the www home host", () => {
    for (const host of [
      "sppdamaks.com",
      "www.sppdamaks.com",
      "shop.sppdamaks.com",
      "used.sppdamaks.com",
      "solar.sppdamaks.com",
    ]) {
      expect(homeBaseUrlFromHost(host)).toBe("https://www.sppdamaks.com");
    }
  });

  it("stays on localhost in development", () => {
    expect(homeBaseUrlFromHost("shop.localhost:3000", "3000")).toBe(
      "http://localhost:3000",
    );
  });
});
