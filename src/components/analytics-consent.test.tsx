import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { AnalyticsConsent } from "./analytics-consent";

describe("AnalyticsConsent", () => {
  beforeEach(() => localStorage.clear());

  it("waits for a choice before enabling analytics", () => {
    render(<AnalyticsConsent measurementId="G-TEST123" />);

    expect(
      screen.getByRole("dialog", { name: /privacy choices/i }),
    ).toBeInTheDocument();
    expect(
      document.querySelector('script[src*="googletagmanager"]'),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /decline analytics/i }));
    expect(localStorage.getItem("sppd-analytics-consent")).toBe("denied");
    expect(
      screen.queryByRole("dialog", { name: /privacy choices/i }),
    ).not.toBeInTheDocument();
  });
});
