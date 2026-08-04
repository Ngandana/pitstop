import { describe, expect, it } from "vitest";
import { formatCents, formatDate, formatKm, formatKmValue } from "./format";

describe("formatCents", () => {
  it("formats zero", () => {
    expect(formatCents(0)).toBe("R 0,00");
  });

  it("formats an amount under R1 000 with two decimal cents", () => {
    expect(formatCents(4599)).toBe("R 45,99");
  });

  it("groups thousands with a space, comma for decimals (SA convention)", () => {
    expect(formatCents(123456)).toBe("R 1 234,56");
  });

  it("groups multiple thousands correctly", () => {
    expect(formatCents(123456789)).toBe("R 1 234 567,89");
  });

  it("pads single-digit cents", () => {
    expect(formatCents(100005)).toBe("R 1 000,05");
  });

  it("formats negative amounts with a leading minus before the R", () => {
    expect(formatCents(-4599)).toBe("-R 45,99");
  });

  it("rounds fractional cent input defensively (money should never be a float, but format defensively anyway)", () => {
    expect(formatCents(4599.4)).toBe("R 45,99");
  });
});

describe("formatKm", () => {
  it("formats zero", () => {
    expect(formatKm(0)).toBe("0 km");
  });

  it("groups thousands with a space", () => {
    expect(formatKm(1240)).toBe("1 240 km");
  });

  it("groups large distances correctly", () => {
    expect(formatKm(123456)).toBe("123 456 km");
  });

  it("rounds fractional km", () => {
    expect(formatKm(1240.6)).toBe("1 241 km");
  });
});

describe("formatKmValue", () => {
  it("omits the unit suffix", () => {
    expect(formatKmValue(1240)).toBe("1 240");
  });
});

describe("formatDate", () => {
  it("renders a UTC instant in Africa/Johannesburg (UTC+2, no DST)", () => {
    // 23:30 UTC on 31 Dec -> 01:30 SAST on 1 Jan
    expect(formatDate("2025-12-31T23:30:00Z")).toBe("1 Jan 2026");
  });

  it("accepts a custom pattern", () => {
    expect(formatDate("2026-08-04T10:00:00Z", "yyyy-MM-dd")).toBe("2026-08-04");
  });
});
