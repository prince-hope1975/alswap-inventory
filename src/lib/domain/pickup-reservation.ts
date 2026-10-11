export const PICKUP_HOLD_HOURS = 24;
export function pickupExpiresAt(now = new Date()) {
  return new Date(now.getTime() + PICKUP_HOLD_HOURS * 60 * 60 * 1000);
}
export function reservationDeadline(value: Date | string) {
  return (
    new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Lagos",
    }).format(new Date(value)) + " (WAT)"
  );
}
