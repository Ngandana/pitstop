/**
 * Money, distance, and date formatting — SA conventions, hand-rolled
 * rather than left to `Intl` locale data. A financial app can't afford
 * "R 1 234,56" on one machine and "R 1,234.56" on another because two
 * environments disagree on ICU locale data for `en-ZA`.
 */

import { formatInTimeZone } from "date-fns-tz";

const FLEET_TIMEZONE = "Africa/Johannesburg";

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/**
 * Integer cents -> "R 1 234,56" (space thousands separator, comma decimal —
 * the SA convention required by §3). Negative amounts render as "-R 12,00".
 */
export function formatCents(cents: number): string {
  if (!Number.isFinite(cents)) return "R 0,00";
  const negative = cents < 0;
  const abs = Math.round(Math.abs(cents));
  const rands = Math.floor(abs / 100);
  const centsPart = abs % 100;
  const randsStr = groupThousands(rands.toString());
  const centsStr = centsPart.toString().padStart(2, "0");
  return `${negative ? "-" : ""}R ${randsStr},${centsStr}`;
}

/** Integer km -> "1 240 km" (space thousands separator). */
export function formatKm(km: number): string {
  if (!Number.isFinite(km)) return "0 km";
  return `${groupThousands(Math.round(km).toString())} km`;
}

/** Integer km -> "1 240" with no unit suffix, for use next to a shared label. */
export function formatKmValue(km: number): string {
  if (!Number.isFinite(km)) return "0";
  return groupThousands(Math.round(km).toString());
}

/**
 * Render a UTC instant in Africa/Johannesburg. Dates are always stored
 * UTC and rendered in the fleet's timezone at the boundary (§3).
 */
export function formatDate(date: Date | string, pattern = "d MMM yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, FLEET_TIMEZONE, pattern);
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, "d MMM yyyy, HH:mm");
}
