import { describe, expect, it } from "vitest";

import { crawlerPolicy } from "./crawler-policy";

describe("crawlerPolicy", () => {
  it("allows search discovery while opting public content out of GPTBot training", () => {
    const policy = crawlerPolicy("shop");

    expect(policy.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userAgent: "OAI-SearchBot",
          allow: expect.arrayContaining(["/products/", "/llms.txt"]) as unknown,
        }),
        expect.objectContaining({ userAgent: "GPTBot", disallow: "/" }),
      ]),
    );
  });

  it("keeps named AI search agents out of private paths", () => {
    const rules = crawlerPolicy("shop").rules;
    const list = Array.isArray(rules) ? rules : [rules];
    for (const agent of ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"]) {
      expect(list.find((r) => r.userAgent === agent)?.disallow).toEqual(
        expect.arrayContaining(["/inventory/", "/api/"]),
      );
    }
  });

  it("blocks every crawler from the back office", () => {
    expect(crawlerPolicy("app").rules).toEqual([
      { userAgent: "*", disallow: "/" },
    ]);
  });
});
