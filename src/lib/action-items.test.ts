import { describe, expect, it } from "vitest";
import { daysUntil, hasBikeStalled } from "./action-items";

describe("daysUntil", () => {
  it("is 0 for later the same SAST day", () => {
    // 10:00 and 15:00 UTC are both Aug 4 in SAST (UTC+2)
    const now = new Date("2026-08-04T10:00:00Z");
    expect(daysUntil(new Date("2026-08-04T15:00:00Z"), now)).toBe(0);
  });

  it("is positive once the SAST calendar day rolls over, even if UTC clock times are close", () => {
    // 21:00 UTC = 23:00 SAST (Aug 4); 22:30 UTC = 00:30 SAST (Aug 5)
    const now = new Date("2026-08-04T21:00:00Z");
    expect(daysUntil(new Date("2026-08-04T22:30:00Z"), now)).toBe(1);
  });

  it("is negative for a past date", () => {
    const now = new Date("2026-08-04T10:00:00Z");
    expect(daysUntil(new Date("2026-07-28T10:00:00Z"), now)).toBe(-7);
  });
});

describe("hasBikeStalled", () => {
  const now = new Date("2026-08-04T12:00:00Z");

  it("is false with no readings", () => {
    expect(hasBikeStalled([], now)).toBe(false);
  });

  it("is false with only recent history (can't tell either way)", () => {
    const readings = [
      { km: 1000, at: new Date("2026-08-04T06:00:00Z") },
      { km: 1000, at: new Date("2026-08-04T10:00:00Z") },
    ];
    expect(hasBikeStalled(readings, now)).toBe(false);
  });

  it("is true when km hasn't changed since a reading >=48h ago", () => {
    const readings = [
      { km: 5000, at: new Date("2026-08-01T12:00:00Z") }, // 72h ago — the baseline (>=48h old)
      { km: 5000, at: new Date("2026-08-03T12:00:00Z") }, // 36h ago — too recent to be the baseline
      { km: 5000, at: new Date("2026-08-04T09:00:00Z") }, // 3h ago (latest)
    ];
    expect(hasBikeStalled(readings, now)).toBe(true);
  });

  it("is false when km increased since the 48h-ago baseline", () => {
    const readings = [
      { km: 5000, at: new Date("2026-08-02T12:00:00Z") }, // baseline, 48h ago
      { km: 5120, at: new Date("2026-08-04T09:00:00Z") }, // latest, moved
    ];
    expect(hasBikeStalled(readings, now)).toBe(false);
  });

  it("respects a custom threshold", () => {
    const readings = [
      { km: 200, at: new Date("2026-08-04T04:00:00Z") }, // 8h ago
      { km: 200, at: new Date("2026-08-04T11:00:00Z") }, // 1h ago
    ];
    expect(hasBikeStalled(readings, now, 6)).toBe(true);
    expect(hasBikeStalled(readings, now, 12)).toBe(false);
  });
});
