/**
 * Pure calculation logic behind the Today screen's "needs action" list.
 * Kept separate from the DB queries in src/lib/queries/today.ts so it's
 * cheap to unit test — see action-items.test.ts.
 */

import { formatInTimeZone } from "date-fns-tz";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;
const FLEET_TIMEZONE = "Africa/Johannesburg";

/**
 * Whole calendar days from `now` until `date`, counted in the fleet's
 * timezone (§3: store UTC, render Africa/Johannesburg) — not the host
 * machine's local timezone, which would give a different (wrong) answer
 * for instants near midnight SAST.
 */
export function daysUntil(date: Date, now: Date): number {
  const dayString = formatInTimeZone(date, FLEET_TIMEZONE, "yyyy-MM-dd");
  const nowString = formatInTimeZone(now, FLEET_TIMEZONE, "yyyy-MM-dd");
  const dayUtc = new Date(`${dayString}T00:00:00Z`).getTime();
  const nowUtc = new Date(`${nowString}T00:00:00Z`).getTime();
  return Math.round((dayUtc - nowUtc) / MS_PER_DAY);
}

export type OdometerPoint = { km: number; at: Date };

/**
 * True when the bike's odometer hasn't advanced in at least `thresholdHours`
 * (default 48, per §5's "Bike hasn't moved in 48h during an active
 * assignment" trigger). Requires a reading from at or before the threshold
 * window to compare against — with less history than that we don't know
 * either way, so we say no rather than guess.
 */
export function hasBikeStalled(
  readings: OdometerPoint[],
  now: Date,
  thresholdHours = 48,
): boolean {
  if (readings.length === 0) return false;

  const sorted = [...readings].sort((a, b) => a.at.getTime() - b.at.getTime());
  const latest = sorted[sorted.length - 1];
  const cutoff = now.getTime() - thresholdHours * MS_PER_HOUR;

  // Most recent reading at or before the cutoff — the baseline to compare
  // the latest reading against.
  const baseline = [...sorted].reverse().find((r) => r.at.getTime() <= cutoff);
  if (!baseline) return false;

  return baseline.km === latest.km;
}
