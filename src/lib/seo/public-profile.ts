import type { StoreConfig } from "~/types/store-config";

function cleanList(values: string[] | undefined) {
  return values?.map((value) => value.trim()).filter(Boolean) ?? [];
}

function validUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function getPublicProfile(
  config: Partial<StoreConfig> | null | undefined,
) {
  const description = config?.businessDescription?.trim();
  const businessDescription = [description].find(Boolean);
  const serviceAreas = cleanList(config?.serviceAreas);
  const socialProfiles = cleanList(config?.socialProfiles).filter(validUrl);
  const openingHours = (config?.openingHours ?? []).filter(
    (entry) => entry.days.length && entry.opens && entry.closes,
  );

  return {
    businessDescription,
    serviceAreas,
    socialProfiles,
    openingHours,
  };
}
