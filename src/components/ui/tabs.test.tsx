import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { nextTabIndex, Tabs } from "./tabs";

describe("nextTabIndex", () => {
  it("wraps arrow keys and supports Home/End", () => {
    expect(nextTabIndex("ArrowRight", 2, 3)).toBe(0);
    expect(nextTabIndex("ArrowLeft", 0, 3)).toBe(2);
    expect(nextTabIndex("Home", 2, 3)).toBe(0);
    expect(nextTabIndex("End", 0, 3)).toBe(2);
    expect(nextTabIndex("a", 0, 3)).toBeNull();
  });
});

function Harness() {
  const [tab, setTab] = useState<"a" | "b">("a");
  return (
    <Tabs label="Views" items={[{ key: "a", label: "Alpha" }, { key: "b", label: "Beta" }]} value={tab} onChange={setTab}>
      {tab === "a" ? "Panel A" : "Panel B"}
    </Tabs>
  );
}

describe("Tabs", () => {
  it("exposes tab roles and moves with arrow keys", () => {
    render(<Harness />);
    const alpha = screen.getByRole("tab", { name: "Alpha" });
    expect(screen.getByRole("tablist", { name: "Views" })).toBeInTheDocument();
    expect(alpha).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel A");
    fireEvent.keyDown(alpha, { key: "ArrowRight" });
    const beta = screen.getByRole("tab", { name: "Beta" });
    expect(beta).toHaveAttribute("aria-selected", "true");
    expect(beta).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel B");
  });
});
