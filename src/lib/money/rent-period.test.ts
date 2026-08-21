import { describe, expect, it } from "vitest";
import { computeNextRentPeriod, daysBetween } from "./rent-period";

describe("computeNextRentPeriod", () => {
  it("starts a clean full week when the assignment begins exactly on the due weekday", () => {
    // 2026-08-05 is a Wednesday (weekday 3)
    const period = computeNextRentPeriod({
      startedAt: "2026-08-05",
      rentDueWeekday: 3,
      weeklyRentCents: 70000,
      lastChargePeriodEnd: null,
    });
    expect(period).toEqual({ periodStart: "2026-08-05", periodEnd: "2026-08-11", amountCents: 70000 });
  });

  it("prorates a stub period when the assignment starts mid-week", () => {
    // 2026-08-03 is a Monday (weekday 1); next Wednesday is 2026-08-05.
    // Stub covers Mon+Tue = 2 days.
    const period = computeNextRentPeriod({
      startedAt: "2026-08-03",
      rentDueWeekday: 3,
      weeklyRentCents: 70000,
      lastChargePeriodEnd: null,
    });
    expect(period.periodStart).toBe("2026-08-03");
    expect(period.periodEnd).toBe("2026-08-04");
    expect(period.amountCents).toBe(Math.round((70000 / 7) * 2));
  });

  it("prorates a 6-day stub when the assignment starts the day after the due weekday", () => {
    // 2026-08-06 is a Thursday; next Wednesday is 2026-08-12 -> 6-day stub.
    const period = computeNextRentPeriod({
      startedAt: "2026-08-06",
      rentDueWeekday: 3,
      weeklyRentCents: 70000,
      lastChargePeriodEnd: null,
    });
    expect(period.periodEnd).toBe("2026-08-11");
    expect(period.amountCents).toBe(Math.round((70000 / 7) * 6));
  });

  it("continues with clean 7-day blocks once a prior charge exists", () => {
    const period = computeNextRentPeriod({
      startedAt: "2026-08-03",
      rentDueWeekday: 3,
      weeklyRentCents: 70000,
      lastChargePeriodEnd: "2026-08-04", // the stub period from the previous test
    });
    expect(period).toEqual({ periodStart: "2026-08-05", periodEnd: "2026-08-11", amountCents: 70000 });
  });

  it("keeps chaining full weeks indefinitely", () => {
    const period = computeNextRentPeriod({
      startedAt: "2026-08-05",
      rentDueWeekday: 3,
      weeklyRentCents: 70000,
      lastChargePeriodEnd: "2026-08-11",
    });
    expect(period).toEqual({ periodStart: "2026-08-12", periodEnd: "2026-08-18", amountCents: 70000 });
  });
});

describe("daysBetween", () => {
  it("counts whole days forward", () => {
    expect(daysBetween("2026-08-01", "2026-08-08")).toBe(7);
  });

  it("is negative going backward", () => {
    expect(daysBetween("2026-08-08", "2026-08-01")).toBe(-7);
  });

  it("is 0 for the same date", () => {
    expect(daysBetween("2026-08-01", "2026-08-01")).toBe(0);
  });
});
