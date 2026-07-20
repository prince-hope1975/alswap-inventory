export interface SolarApplianceInput {
  name: string;
  watts: number;
  quantity: number;
  hoursPerDay: number;
  surgeMultiplier?: number;
}

export interface SolarEstimateConfig {
  inverterHeadroom: number;
  batteryDepthOfDischarge: number;
  batteryEfficiency: number;
  solarSystemEfficiency: number;
  panelWatts: number;
}

export interface SolarEstimateInput {
  appliances: SolarApplianceInput[];
  backupHours: number;
  peakSunHours: number;
  config?: SolarEstimateConfig;
}

const DEFAULT_CONFIG: SolarEstimateConfig = {
  inverterHeadroom: 1.25,
  batteryDepthOfDischarge: 0.8,
  batteryEfficiency: 0.9,
  solarSystemEfficiency: 0.75,
  panelWatts: 550,
};

function roundUp(value: number, increment: number) {
  return Math.ceil(value / increment) * increment;
}

export function estimateSolarSystem(input: SolarEstimateInput) {
  const config = input.config ?? DEFAULT_CONFIG;

  if (input.appliances.length === 0) throw new Error("Add at least one appliance");
  if (input.peakSunHours <= 0) throw new Error("Peak sun hours must be greater than zero");

  for (const appliance of input.appliances) {
    if (appliance.watts <= 0) throw new Error("Appliance wattage must be greater than zero");
    if (appliance.quantity <= 0) throw new Error("Appliance quantity must be greater than zero");
    if (appliance.hoursPerDay < 0 || appliance.hoursPerDay > 24) {
      throw new Error("Appliance hours must be between zero and 24");
    }
  }

  const peakLoadWatts = Math.round(
    input.appliances.reduce(
      (total, appliance) =>
        total + appliance.watts * appliance.quantity * (appliance.surgeMultiplier ?? 1),
      0,
    ),
  );
  const dailyEnergyWh = Math.round(
    input.appliances.reduce(
      (total, appliance) => total + appliance.watts * appliance.quantity * appliance.hoursPerDay,
      0,
    ),
  );
  const recommendedInverterWatts = roundUp(peakLoadWatts * config.inverterHeadroom, 500);
  const recommendedBatteryWh = Math.ceil(
    dailyEnergyWh / (config.batteryDepthOfDischarge * config.batteryEfficiency),
  );
  const recommendedSolarWatts = Math.ceil(
    dailyEnergyWh / (input.peakSunHours * config.solarSystemEfficiency),
  );

  return {
    peakLoadWatts,
    dailyEnergyWh,
    recommendedInverterWatts,
    recommendedBatteryWh,
    recommendedSolarWatts,
    recommendedPanelCount: Math.ceil(recommendedSolarWatts / config.panelWatts),
    assumptions: config,
  };
}
