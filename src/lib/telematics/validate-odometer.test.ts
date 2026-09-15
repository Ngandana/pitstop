import { describe, expect, it } from "vitest";
import { validateOdometerReading } from "./validate-odometer";

describe("validateOdometerReading", () => {
  it("accepts the first-ever reading regardless of value", () => {
    expect(validateOdometerReading({ previousKm: null, newKm: 999_999, override: false })).toEqual(
      { valid: true },
    );
  });

  it("accepts an increase within the 500km threshold", () => {
    expect(validateOdometerReading({ previousKm: 1000, newKm: 1450, override: false })).toEqual({
      valid: true,
    });
  });

  it("accepts an increase of exactly 500km (boundary)", () => {
    expect(validateOdometerReading({ previousKm: 1000, newKm: 1500, override: false })).toEqual({
      valid: true,
    });
  });

  it("accepts an unchanged reading (bike parked)", () => {
    expect(validateOdometerReading({ previousKm: 1000, newKm: 1000, override: false })).toEqual({
      valid: true,
    });
  });

  it("rejects a reading lower than the previous one", () => {
    const result = validateOdometerReading({ previousKm: 1000, newKm: 900, override: false });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/lower/);
  });

  it("rejects a jump of more than 500km", () => {
    const result = validateOdometerReading({ previousKm: 1000, newKm: 1600, override: false });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/500 km/);
  });

  it("accepts a lower reading when override is set", () => {
    expect(validateOdometerReading({ previousKm: 1000, newKm: 900, override: true })).toEqual({
      valid: true,
    });
  });

  it("accepts a >500km jump when override is set", () => {
    expect(validateOdometerReading({ previousKm: 1000, newKm: 5000, override: true })).toEqual({
      valid: true,
    });
  });

  // The ceiling is a per-day allowance, not a flat one. Without this, any
  // gap in nightly syncing jams a bike's sync permanently: the stored
  // reading never advances, so every subsequent night is rejected too.
  describe("jump ceiling scales with elapsed time", () => {
    it("treats an unknown elapsed time as a single day", () => {
      const result = validateOdometerReading({
        previousKm: 1000,
        newKm: 1600,
        override: false,
        daysElapsed: null,
      });
      expect(result.valid).toBe(false);
    });

    it("still rejects a >500km jump when only one day has passed", () => {
      const result = validateOdometerReading({
        previousKm: 1000,
        newKm: 1600,
        override: false,
        daysElapsed: 1,
      });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toMatch(/500 km/);
    });

    it("accepts a multi-day catch-up that a flat ceiling would reject", () => {
      // The real case that exposed this: CEY43374 covered 2,383 km during
      // the 25 days the cron wasn't running, which a flat 500 km ceiling
      // rejects even though the reading is perfectly genuine.
      expect(
        validateOdometerReading({
          previousKm: 2782,
          newKm: 5165,
          override: false,
          daysElapsed: 25,
        }),
      ).toEqual({ valid: true });
    });

    it("still rejects a jump beyond even the scaled allowance", () => {
      const result = validateOdometerReading({
        previousKm: 1000,
        newKm: 20_000,
        override: false,
        daysElapsed: 3,
      });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toMatch(/1500 km threshold for the 3 days/);
    });

    it("never scales below one day's allowance for a same-day re-read", () => {
      expect(
        validateOdometerReading({
          previousKm: 1000,
          newKm: 1400,
          override: false,
          daysElapsed: 0.05,
        }),
      ).toEqual({ valid: true });
    });

    it("rejects a backwards reading no matter how much time has passed", () => {
      // A replaced tracker restarts near zero; elapsed time must never
      // make that look acceptable. Only a human override re-baselines it.
      const result = validateOdometerReading({
        previousKm: 9262,
        newKm: 185,
        override: false,
        daysElapsed: 25,
      });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toMatch(/lower/);
    });
  });
});
