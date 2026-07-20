import { describe, expect, it } from "vitest";

import { estimateSolarSystem } from "./solar";

describe("estimateSolarSystem", () => {
  it("sizes load, inverter, battery, and panels from appliance usage", () => {
    const estimate = estimateSolarSystem({
      appliances: [
        { name: "Television", watts: 120, quantity: 1, hoursPerDay: 6, surgeMultiplier: 1 },
        { name: "Fan", watts: 75, quantity: 2, hoursPerDay: 8, surgeMultiplier: 1.2 },
      ],
      backupHours: 8,
      peakSunHours: 5,
      config: {
        inverterHeadroom: 1.25,
        batteryDepthOfDischarge: 0.8,
        batteryEfficiency: 0.9,
        solarSystemEfficiency: 0.75,
        panelWatts: 550,
      },
    });

    expect(estimate.peakLoadWatts).toBe(300);
    expect(estimate.dailyEnergyWh).toBe(1920);
    expect(estimate.recommendedInverterWatts).toBe(500);
    expect(estimate.recommendedBatteryWh).toBe(2667);
    expect(estimate.recommendedSolarWatts).toBe(512);
    expect(estimate.recommendedPanelCount).toBe(1);
  });

  it("rejects impossible or unsafe inputs", () => {
    expect(() =>
      estimateSolarSystem({
        appliances: [{ name: "Invalid", watts: -1, quantity: 1, hoursPerDay: 2 }],
        backupHours: 4,
        peakSunHours: 5,
      }),
    ).toThrow("Appliance wattage must be greater than zero");
  });
});
