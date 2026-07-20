export const SOLAR_LEAD_STATUSES = [
  "NEW",
  "SURVEY_REQUESTED",
  "SURVEY_CONFIRMED",
  "QUOTED",
  "DEPOSIT_PAID",
  "INSTALLING",
  "COMPLETED",
  "LOST",
] as const;

export type SolarLeadStatus = (typeof SOLAR_LEAD_STATUSES)[number];

const NEXT_STATUS: Partial<Record<SolarLeadStatus, readonly SolarLeadStatus[]>> = {
  NEW: ["SURVEY_REQUESTED", "LOST"],
  SURVEY_REQUESTED: ["SURVEY_CONFIRMED", "LOST"],
  SURVEY_CONFIRMED: ["QUOTED", "LOST"],
  QUOTED: ["DEPOSIT_PAID", "LOST"],
  DEPOSIT_PAID: ["INSTALLING", "LOST"],
  INSTALLING: ["COMPLETED", "LOST"],
};

export function canTransitionSolarLead(from: SolarLeadStatus, to: SolarLeadStatus) {
  return from === to || NEXT_STATUS[from]?.includes(to) === true;
}

export function nextSolarLeadStatus(status: SolarLeadStatus) {
  return NEXT_STATUS[status]?.find((candidate) => candidate !== "LOST") ?? null;
}
