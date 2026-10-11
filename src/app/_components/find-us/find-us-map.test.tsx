import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("next/dynamic", () => ({ default: () => () => <div>Store map</div> }));
import { FindUsMap } from "./find-us-map";
afterEach(cleanup);
it("uses the supplied listing and exact pin for directions", () => {
  render(
    <FindUsMap
      lat={5.5907057}
      lng={5.7083863}
      googleMapsUrl="https://maps.app.goo.gl/DooAZktPyKXWHUfKA"
    />,
  );
  expect(
    screen
      .getByRole("link", { name: "Open in Google Maps" })
      .getAttribute("href"),
  ).toBe("https://maps.app.goo.gl/DooAZktPyKXWHUfKA");
  expect(
    new URL(
      screen
        .getByRole("link", { name: "Get directions" })
        .getAttribute("href")!,
    ).searchParams.get("destination"),
  ).toBe("5.5907057,5.7083863");
});
it("falls back to coordinate lookup instead of accepting an unsafe place link", () => {
  render(
    <FindUsMap
      lat={5.5907057}
      lng={5.7083863}
      googleMapsUrl="javascript:alert(1)"
    />,
  );
  expect(
    screen
      .getByRole("link", { name: "Open in Google Maps" })
      .getAttribute("href"),
  ).toContain("https://www.google.com/maps/search/");
});
