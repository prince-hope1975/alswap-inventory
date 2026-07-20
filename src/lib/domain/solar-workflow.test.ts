import { describe, expect, it } from "vitest";

import { canTransitionSolarLead } from "./solar-workflow";

describe("solar lead workflow", () => {
  it("supports the survey-to-installation happy path", () => {
    expect(canTransitionSolarLead("SURVEY_REQUESTED", "SURVEY_CONFIRMED")).toBe(true);
    expect(canTransitionSolarLead("QUOTED", "DEPOSIT_PAID")).toBe(true);
    expect(canTransitionSolarLead("INSTALLING", "COMPLETED")).toBe(true);
  });

  it("prevents skipping directly from a new lead to installation", () => {
    expect(canTransitionSolarLead("NEW", "INSTALLING")).toBe(false);
  });
});
