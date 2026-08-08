import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrackedLink } from "./tracked-link";

describe("TrackedLink", () => {
  afterEach(() => {
    window.gtag = undefined;
  });

  it("reports the configured conversion event without changing the destination", () => {
    window.gtag = vi.fn();
    render(
      <TrackedLink
        href="tel:+2348000000000"
        eventName="click_call"
        onClick={(event) => event.preventDefault()}
      >
        Call store
      </TrackedLink>,
    );
    fireEvent.click(screen.getByRole("link", { name: "Call store" }));
    expect(window.gtag).toHaveBeenCalledWith("event", "click_call", {
      link_url: "tel:+2348000000000",
    });
  });
});
