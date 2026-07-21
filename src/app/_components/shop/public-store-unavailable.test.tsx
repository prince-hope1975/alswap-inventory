// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PublicStoreUnavailable } from "./public-store-unavailable";

afterEach(cleanup);

describe("PublicStoreUnavailable", () => {
  it("shows a neutral unavailable state without fallback store branding", () => {
    render(<PublicStoreUnavailable />);

    expect(
      screen.getByRole("heading", { name: /store unavailable/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/alswap store/i)).not.toBeInTheDocument();
  });
});
