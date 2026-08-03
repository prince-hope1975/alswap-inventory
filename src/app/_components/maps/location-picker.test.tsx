import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./leaflet-setup", () => ({
  ensureLeafletMarkerIcons: vi.fn(),
}));

vi.mock("react-leaflet", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  const MapContext = React.createContext<{
    setView: (center: [number, number], zoom: number) => void;
  } | null>(null);

  return {
    MapContainer: ({
      center,
      children,
    }: {
      center: [number, number];
      children: React.ReactNode;
    }) => {
      const [currentCenter, setCurrentCenter] = React.useState(center);
      const map = React.useMemo(
        () => ({
          setView: (nextCenter: [number, number]) =>
            setCurrentCenter(nextCenter),
        }),
        [],
      );

      return (
        <MapContext.Provider value={map}>
          <div data-testid="pickup-map" data-center={currentCenter.join(",")}>
            {children}
          </div>
        </MapContext.Provider>
      );
    },
    Marker: () => null,
    TileLayer: () => null,
    useMap: () => {
      const map = React.useContext(MapContext);
      if (!map) throw new Error("useMap must be used inside MapContainer");
      return map;
    },
    useMapEvents: () => null,
  };
});

import { LocationPicker } from "./location-picker";

afterEach(cleanup);

describe("LocationPicker", () => {
  it("recenters the map when asynchronously loaded pickup coordinates become available", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <LocationPicker onChange={onChange} value={null} />,
    );

    expect(screen.getByTestId("pickup-map")).toHaveAttribute(
      "data-center",
      "6.5244,3.3792",
    );

    rerender(
      <LocationPicker
        onChange={onChange}
        value={{
          lat: 5.593032,
          lng: 5.708529,
          address: "Obireko Tree, Jeddo, Delta State",
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("pickup-map")).toHaveAttribute(
        "data-center",
        "5.593032,5.708529",
      );
    });
  });
});
