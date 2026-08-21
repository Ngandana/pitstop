/**
 * §5's service-due formula, verbatim:
 *
 *   progress = MAX(
 *     (current_km - last_service_km) / interval_km,
 *     (today - last_service_at) / max_interval_days
 *   )
 *
 * progress >= 0.8 -> warning, >= 1.0 -> due, >= 1.2 -> overdue.
 * Never stored — always computed at read time (§4).
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ServiceStatus = "ok" | "warning" | "due" | "overdue";

export function calculateServiceProgress(params: {
  /** null when the bike has no odometer reading yet — km-based progress can't be computed, day-based still can. */
  currentKm: number | null;
  lastServiceKm: number;
  intervalKm: number;
  lastServiceAt: Date;
  maxIntervalDays: number;
  asOf?: Date;
}): number {
  const { currentKm, lastServiceKm, intervalKm, lastServiceAt, maxIntervalDays, asOf = new Date() } =
    params;

  const kmProgress = currentKm !== null ? (currentKm - lastServiceKm) / intervalKm : 0;
  const daysSince = (asOf.getTime() - lastServiceAt.getTime()) / MS_PER_DAY;
  const dayProgress = daysSince / maxIntervalDays;

  return Math.max(kmProgress, dayProgress);
}

export function serviceStatusFromProgress(progress: number): ServiceStatus {
  if (progress >= 1.2) return "overdue";
  if (progress >= 1.0) return "due";
  if (progress >= 0.8) return "warning";
  return "ok";
}

/** Negative once overdue by distance. Null when there's no odometer reading to measure from. */
export function kmToNextService(params: {
  currentKm: number | null;
  lastServiceKm: number;
  intervalKm: number;
}): number | null {
  if (params.currentKm === null) return null;
  return params.lastServiceKm + params.intervalKm - params.currentKm;
}
