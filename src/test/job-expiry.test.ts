import { describe, expect, it, vi } from "vitest";
import { isJobExpired, jobExpiryDateToIso, jobExpiryIsoToDateInput } from "@/lib/job-expiry";

describe("job expiry helpers", () => {
  it("stores expiry dates at the end of the Yangon day", () => {
    expect(jobExpiryDateToIso("2026-05-14")).toBe("2026-05-14T17:29:59.999Z");
  });

  it("round-trips an expiry timestamp into a date input value", () => {
    expect(jobExpiryIsoToDateInput("2026-05-14T17:29:59.999Z")).toBe("2026-05-14");
  });

  it("detects expired listings", () => {
    vi.setSystemTime(new Date("2026-05-15T00:00:00.000Z"));
    expect(isJobExpired("2026-05-14T17:29:59.999Z")).toBe(true);
    expect(isJobExpired("2026-05-15T17:29:59.999Z")).toBe(false);
    vi.useRealTimers();
  });
});