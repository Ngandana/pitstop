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
});
