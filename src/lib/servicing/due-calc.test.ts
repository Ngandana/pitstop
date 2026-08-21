import { describe, expect, it } from "vitest";
import { calculateServiceProgress, kmToNextService, serviceStatusFromProgress } from "./due-calc";

describe("calculateServiceProgress", () => {
  const asOf = new Date("2026-08-21T00:00:00Z");

  it("is 0 right after a service, at 0 km and 0 days elapsed", () => {
    const progress = calculateServiceProgress({
      currentKm: 1000,
      lastServiceKm: 1000,
      intervalKm: 1500,
      lastServiceAt: asOf,
      maxIntervalDays: 45,
      asOf,
    });
    expect(progress).toBe(0);
  });

  it("uses km progress when it's the larger of the two", () => {
    // 750/1500 km = 0.5, 1 day/45 days ~= 0.022
    const progress = calculateServiceProgress({
      currentKm: 1750,
      lastServiceKm: 1000,
      intervalKm: 1500,
      lastServiceAt: new Date(asOf.getTime() - 1 * 24 * 60 * 60 * 1000),
      maxIntervalDays: 45,
      asOf,
    });
    expect(progress).toBeCloseTo(0.5, 5);
  });

  it("uses day progress when it's the larger of the two (bike parked a long time)", () => {
    // 0 km travelled, but 30/45 days elapsed = 0.667
    const progress = calculateServiceProgress({
      currentKm: 1000,
      lastServiceKm: 1000,
      intervalKm: 1500,
      lastServiceAt: new Date(asOf.getTime() - 30 * 24 * 60 * 60 * 1000),
      maxIntervalDays: 45,
      asOf,
    });
    expect(progress).toBeCloseTo(30 / 45, 5);
  });

  it("falls back to day-only progress when there's no odometer reading", () => {
    const progress = calculateServiceProgress({
      currentKm: null,
      lastServiceKm: 1000,
      intervalKm: 1500,
      lastServiceAt: new Date(asOf.getTime() - 45 * 24 * 60 * 60 * 1000),
      maxIntervalDays: 45,
      asOf,
    });
    expect(progress).toBeCloseTo(1, 5);
  });

  it("can exceed 1.2 (overdue) when badly neglected", () => {
    const progress = calculateServiceProgress({
      currentKm: 3000,
      lastServiceKm: 1000,
      intervalKm: 1500,
      lastServiceAt: asOf,
      maxIntervalDays: 45,
      asOf,
    });
    expect(progress).toBeCloseTo(2000 / 1500, 5);
  });
});

describe("serviceStatusFromProgress", () => {
  it("is ok below 0.8", () => {
    expect(serviceStatusFromProgress(0)).toBe("ok");
    expect(serviceStatusFromProgress(0.79)).toBe("ok");
  });

  it("is warning from 0.8 up to (not including) 1.0", () => {
    expect(serviceStatusFromProgress(0.8)).toBe("warning");
    expect(serviceStatusFromProgress(0.99)).toBe("warning");
  });

  it("is due from 1.0 up to (not including) 1.2", () => {
    expect(serviceStatusFromProgress(1.0)).toBe("due");
    expect(serviceStatusFromProgress(1.19)).toBe("due");
  });

  it("is overdue from 1.2 up", () => {
    expect(serviceStatusFromProgress(1.2)).toBe("overdue");
    expect(serviceStatusFromProgress(5)).toBe("overdue");
  });
});

describe("kmToNextService", () => {
  it("is positive when there's distance left", () => {
    expect(kmToNextService({ currentKm: 1000, lastServiceKm: 1000, intervalKm: 1500 })).toBe(1500);
    expect(kmToNextService({ currentKm: 1400, lastServiceKm: 1000, intervalKm: 1500 })).toBe(1100);
  });

  it("is negative once overdue by distance", () => {
    expect(kmToNextService({ currentKm: 2600, lastServiceKm: 1000, intervalKm: 1500 })).toBe(-100);
  });

  it("is null with no odometer reading", () => {
    expect(kmToNextService({ currentKm: null, lastServiceKm: 1000, intervalKm: 1500 })).toBeNull();
  });
});
