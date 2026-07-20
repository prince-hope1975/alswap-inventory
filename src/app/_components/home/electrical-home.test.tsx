import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ElectricalHome } from "./electrical-home";

describe("ElectricalHome", () => {
  it("introduces the business and sends shoppers to the dedicated catalog", () => {
    render(<ElectricalHome tenant={{ name: "SPPD Amaks", phone: "08012345678" }} />);

    expect(screen.getByRole("heading", { name: /electrical supplies/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /shop products/i })[0]).toHaveAttribute("href", "/shop");
    expect(screen.getByRole("link", { name: /size a solar system/i })).toHaveAttribute("href", "/solar");
  });
});
