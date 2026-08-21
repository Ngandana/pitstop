import { describe, expect, it } from "vitest";
import { calculateArrears, calculateBalance } from "./balance";

const charge = (periodStart: string, periodEnd: string, amountCents: number, waivedCents = 0) => ({
  periodStart,
  periodEnd,
  amountCents,
  waivedCents,
});

describe("calculateBalance", () => {
  it("is 0 with no charges and no payments", () => {
    expect(calculateBalance([], [])).toBe(0);
  });

  it("is the full charge amount when nothing's been paid", () => {
    expect(calculateBalance([charge("2026-08-01", "2026-08-07", 70000)], [])).toBe(70000);
  });

  it("subtracts payments from charges", () => {
    const balance = calculateBalance(
      [charge("2026-08-01", "2026-08-07", 70000)],
      [{ amountCents: 30000 }],
    );
    expect(balance).toBe(40000);
  });

  it("can go negative (driver in credit)", () => {
    const balance = calculateBalance(
      [charge("2026-08-01", "2026-08-07", 70000)],
      [{ amountCents: 100000 }],
    );
    expect(balance).toBe(-30000);
  });

  it("nets out waived amounts before summing", () => {
    const balance = calculateBalance([charge("2026-08-01", "2026-08-07", 70000, 70000)], []);
    expect(balance).toBe(0);
  });

  it("sums across multiple charges and payments", () => {
    const balance = calculateBalance(
      [
        charge("2026-08-01", "2026-08-07", 70000),
        charge("2026-08-08", "2026-08-14", 70000, 20000),
      ],
      [{ amountCents: 50000 }, { amountCents: 40000 }],
    );
    // charged: 70000 + (70000-20000) = 120000; paid: 90000
    expect(balance).toBe(30000);
  });
});

describe("calculateArrears", () => {
  const asOf = "2026-08-21";

  it("is 0 days when fully paid up", () => {
    const result = calculateArrears({
      charges: [charge("2026-08-01", "2026-08-07", 70000)],
      totalPaidCents: 70000,
      asOf,
    });
    expect(result).toEqual({ daysInArrears: 0, oldestUnpaidChargeEnd: null });
  });

  it("is 0 days when overpaid", () => {
    const result = calculateArrears({
      charges: [charge("2026-08-01", "2026-08-07", 70000)],
      totalPaidCents: 100000,
      asOf,
    });
    expect(result.daysInArrears).toBe(0);
  });

  it("finds the oldest unpaid charge when nothing's been paid", () => {
    const result = calculateArrears({
      charges: [charge("2026-08-01", "2026-08-07", 70000)],
      totalPaidCents: 0,
      asOf,
    });
    // period ended 2026-08-07, asOf is 2026-08-21 -> 14 days
    expect(result.oldestUnpaidChargeEnd).toBe("2026-08-07");
    expect(result.daysInArrears).toBe(14);
  });

  it("applies payments FIFO across multiple charges, oldest first", () => {
    const result = calculateArrears({
      charges: [
        charge("2026-08-01", "2026-08-07", 70000), // fully paid
        charge("2026-08-08", "2026-08-14", 70000), // partially paid -> oldest unpaid
        charge("2026-08-15", "2026-08-21", 70000), // untouched
      ],
      totalPaidCents: 90000, // covers charge 1 (70000) + 20000 of charge 2
      asOf,
    });
    expect(result.oldestUnpaidChargeEnd).toBe("2026-08-14");
    expect(result.daysInArrears).toBe(7);
  });

  it("treats a waived charge as already satisfied", () => {
    const result = calculateArrears({
      charges: [charge("2026-08-01", "2026-08-07", 70000, 70000)],
      totalPaidCents: 0,
      asOf,
    });
    expect(result.daysInArrears).toBe(0);
  });

  it("ignores charge order in the input array (sorts internally)", () => {
    const result = calculateArrears({
      charges: [
        charge("2026-08-15", "2026-08-21", 70000),
        charge("2026-08-01", "2026-08-07", 70000),
        charge("2026-08-08", "2026-08-14", 70000),
      ],
      totalPaidCents: 0,
      asOf,
    });
    expect(result.oldestUnpaidChargeEnd).toBe("2026-08-07");
  });
});
