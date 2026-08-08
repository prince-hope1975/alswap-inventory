import { describe, expect, it } from "vitest";

import { analyticsConsentFromStorage, analyticsEventSource } from "./consent";

describe("analytics consent", () => {
  it("defaults to undecided and accepts only explicit stored choices", () => {
    expect(analyticsConsentFromStorage(null)).toBe("undecided");
    expect(analyticsConsentFromStorage("granted")).toBe("granted");
    expect(analyticsConsentFromStorage("denied")).toBe("denied");
    expect(analyticsConsentFromStorage("yes")).toBe("undecided");
  });

  it("recognizes ChatGPT campaign referrals", () => {
    expect(analyticsEventSource("?utm_source=chatgpt.com")).toBe("chatgpt");
    expect(analyticsEventSource("?utm_source=google")).toBe("other");
  });
});
