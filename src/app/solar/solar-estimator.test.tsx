// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SolarEstimator } from "./solar-estimator";

describe("SolarEstimator", () => {
  it("creates an accessible estimate and reveals survey capture", () => {
    render(<SolarEstimator />);

    fireEvent.click(screen.getByRole("button", { name: /add standing fan/i }));
    fireEvent.click(screen.getByRole("button", { name: /calculate my system/i }));

    expect(screen.getByRole("heading", { name: /your starting system/i })).toBeInTheDocument();
    expect(screen.getByText(/^planning estimate$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /request a site survey/i })).toBeInTheDocument();
  });
});
