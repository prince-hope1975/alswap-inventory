import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ElectricalHome } from "./electrical-home";

afterEach(cleanup);

describe("ElectricalHome", () => {
  it("introduces the business and sends shoppers to the dedicated catalog", () => {
    render(<ElectricalHome tenant={{ name: "SPPD Amaks", phone: "08012345678" }} />);

    expect(screen.getByRole("heading", { name: /electrical supplies/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /shop products/i })[0]).toHaveAttribute("href", "/shop");
    expect(screen.getByRole("link", { name: /size a solar system/i })).toHaveAttribute("href", "/solar");
  });

  it("shows the registered business name in the footer when given", () => {
    render(
      <ElectricalHome
        tenant={{ name: "SPPD AMAKS", legalName: "S.P.P.D Amak's Electrical & Electronics" }}
      />,
    );

    expect(screen.getByText("S.P.P.D Amak's Electrical & Electronics")).toBeInTheDocument();
  });
});
