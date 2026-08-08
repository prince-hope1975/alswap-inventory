import { describe, expect, it } from "vitest";

import { getPublicProfile } from "./public-profile";

describe("getPublicProfile", () => {
  it("returns only filled, verified-looking public profile values", () => {
    expect(
      getPublicProfile({
        businessDescription: "  Local electrical retailer. ",
        serviceAreas: ["Warri", "", " Jeddo "],
        socialProfiles: ["https://example.com/store", "not-a-url"],
        openingHours: [{ days: ["Monday"], opens: "08:00", closes: "18:00" }],
      }),
    ).toEqual({
      businessDescription: "Local electrical retailer.",
      serviceAreas: ["Warri", "Jeddo"],
      socialProfiles: ["https://example.com/store"],
      openingHours: [{ days: ["Monday"], opens: "08:00", closes: "18:00" }],
    });
  });
});
