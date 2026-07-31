import { describe, expect, it } from "vitest";

import { escapeXml, feedCondition } from "./feed-format";

describe("escapeXml", () => {
  it("escapes all five XML-significant characters", () => {
    expect(escapeXml(`<a href="x">Tom & Jerry's "feed"</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s &quot;feed&quot;&lt;/a&gt;",
    );
  });

  it("leaves plain text untouched", () => {
    expect(escapeXml("Inverter 5kVA")).toBe("Inverter 5kVA");
  });
});

describe("feedCondition", () => {
  it("maps the schema enum to Merchant Center's lowercase values", () => {
    expect(feedCondition("NEW")).toBe("new");
    expect(feedCondition("USED")).toBe("used");
    expect(feedCondition("REFURBISHED")).toBe("refurbished");
  });
});
