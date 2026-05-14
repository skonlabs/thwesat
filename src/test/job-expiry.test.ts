import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isJobExpired,
  jobExpiryDateToIso,
  jobExpiryIsoToDateInput,
  todayDateInput,
} from "@/lib/job-expiry";

afterEach(() => {
  vi.useRealTimers();
});

describe("jobExpiryDateToIso", () => {
  it("stores expiry at end-of-day in Yangon (+06:30)", () => {
    expect(jobExpiryDateToIso("2026-05-14")).toBe("2026-05-14T17:29:59.999Z");
  });

  it("returns null for empty / falsy values", () => {
    expect(jobExpiryDateToIso("")).toBeNull();
    // @ts-expect-error - guard runtime nulls
    expect(jobExpiryDateToIso(null)).toBeNull();
    // @ts-expect-error
    expect(jobExpiryDateToIso(undefined)).toBeNull();
  });

  it("handles leap-day boundary correctly", () => {
    expect(jobExpiryDateToIso("2028-02-29")).toBe("2028-02-29T17:29:59.999Z");
  });

  it("handles year boundaries (Dec 31 stays Dec 31 in Yangon)", () => {
    // 2026-12-31 23:59:59.999+06:30 == 2026-12-31 17:29:59.999Z
    expect(jobExpiryDateToIso("2026-12-31")).toBe("2026-12-31T17:29:59.999Z");
  });
});

describe("jobExpiryIsoToDateInput", () => {
  it("round-trips an end-of-day ISO into the original Yangon date", () => {
    expect(jobExpiryIsoToDateInput("2026-05-14T17:29:59.999Z")).toBe("2026-05-14");
  });

  it("rolls a UTC instant just after Yangon midnight back to the next Yangon day", () => {
    // 2026-05-14 17:30:00Z == 2026-05-15 00:00:00 +06:30
    expect(jobExpiryIsoToDateInput("2026-05-14T17:30:00.000Z")).toBe("2026-05-15");
  });

  it("returns empty string on null/undefined/empty", () => {
    expect(jobExpiryIsoToDateInput(null)).toBe("");
    expect(jobExpiryIsoToDateInput(undefined)).toBe("");
    expect(jobExpiryIsoToDateInput("")).toBe("");
  });

  it("survives a full encode → decode round-trip", () => {
    for (const day of ["2026-01-01", "2026-06-15", "2028-02-29", "2030-12-31"]) {
      const iso = jobExpiryDateToIso(day)!;
      expect(jobExpiryIsoToDateInput(iso)).toBe(day);
    }
  });
});

describe("isJobExpired", () => {
  it("treats null/undefined as not-expired (open-ended listings)", () => {
    expect(isJobExpired(null)).toBe(false);
    expect(isJobExpired(undefined)).toBe(false);
    expect(isJobExpired("")).toBe(false);
  });

  it("returns true when the expiry instant is in the past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T00:00:00.000Z"));
    expect(isJobExpired("2026-05-14T17:29:59.999Z")).toBe(true);
  });

  it("returns false when the expiry instant is in the future", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T00:00:00.000Z"));
    expect(isJobExpired("2026-05-15T17:29:59.999Z")).toBe(false);
  });

  it("returns true at the exact expiry tick (inclusive boundary)", () => {
    vi.useFakeTimers();
    const exact = "2026-05-14T17:29:59.999Z";
    vi.setSystemTime(new Date(exact));
    expect(isJobExpired(exact)).toBe(true);
  });
});

describe("todayDateInput", () => {
  it("returns today's date in the Yangon timezone", () => {
    vi.useFakeTimers();
    // 2026-05-14 17:00:00Z == 2026-05-14 23:30 Yangon (still same day)
    vi.setSystemTime(new Date("2026-05-14T17:00:00.000Z"));
    expect(todayDateInput()).toBe("2026-05-14");
    // 2026-05-14 18:00:00Z == 2026-05-15 00:30 Yangon (next day)
    vi.setSystemTime(new Date("2026-05-14T18:00:00.000Z"));
    expect(todayDateInput()).toBe("2026-05-15");
  });
});
