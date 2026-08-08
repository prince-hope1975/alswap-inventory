import { describe, expect, it } from "vitest";

import { crawlerPolicy } from "./crawler-policy";

describe("crawlerPolicy", () => {
  it("allows search discovery while opting public content out of GPTBot training", () => {
    const policy = crawlerPolicy("shop");

    expect(policy.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userAgent: "OAI-SearchBot", allow: "/" }),
        expect.objectContaining({ userAgent: "GPTBot", disallow: "/" }),
      ]),
    );
  });

  it("blocks every crawler from the back office", () => {
    expect(crawlerPolicy("app").rules).toEqual([
      { userAgent: "*", disallow: "/" },
    ]);
  });
});
