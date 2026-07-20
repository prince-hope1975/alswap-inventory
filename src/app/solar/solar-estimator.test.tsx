// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SolarEstimator } from "./solar-estimator";

afterEach(cleanup);

describe("SolarEstimator", () => {
  it("updates the live estimate and lets customers adjust a selected load", () => {
    render(<SolarEstimator />);

    fireEvent.click(screen.getByRole("button", { name: /add standing fan/i }));

    expect(
      screen.getByRole("heading", { name: /your starting system/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^planning estimate$/i)).toBeInTheDocument();
    expect(screen.getByText("75 W")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /increase standing fan quantity/i }),
    );
    expect(screen.getByText("150 W")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /decrease standing fan quantity/i }),
    );
    expect(screen.getByText("75 W")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /request a site survey/i }),
    ).toBeInTheDocument();
  });

  it("adds a custom appliance to the load plan", () => {
    render(<SolarEstimator />);

    fireEvent.click(
      screen.getByRole("button", { name: /add custom appliance/i }),
    );
    fireEvent.change(screen.getByLabelText(/appliance name/i), {
      target: { value: "Freezer" },
    });
    fireEvent.change(screen.getByLabelText(/^watts/i), {
      target: { value: "300" },
    });
    fireEvent.change(screen.getByLabelText(/hours used per day/i), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save appliance/i }));

    expect(screen.getByText("Freezer")).toBeInTheDocument();
    expect(screen.getAllByText("300 W")).toHaveLength(2);
  });
});
