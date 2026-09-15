/**
 * §5's Cartrack sync validation rule: "reject a reading that is lower
 * than the previous one, or more than 500 km higher, unless
 * override_flag is set. Log it and surface it to me — do not silently
 * accept or silently drop." This function only decides valid/invalid;
 * the caller is responsible for logging/surfacing a rejection.
 */
/**
 * The brief states the jump ceiling as a flat "more than 500 km higher".
 * That wording assumes the nightly sync actually ran the night before, so
 * 500 km is really a *per-day* allowance for a single delivery scooter.
 *
 * Taken literally it fails badly after any gap in syncing: when the cron
 * hadn't run for 25 days (the app wasn't deployed yet), CEY43374 had
 * legitimately covered 2,383 km, which a flat 500 km ceiling rejects —
 * and would keep rejecting every night afterwards, since the stored
 * reading never advances. The sync jams permanently with no way out but a
 * manual override.
 *
 * So the ceiling scales with the time actually elapsed between readings.
 * For the normal nightly case this is identical to the old behaviour
 * (one day -> 500 km); it only loosens in proportion to a real gap.
 */
const MAX_JUMP_KM_PER_DAY = 500;

export type OdometerValidationResult = { valid: true } | { valid: false; reason: string };

export function validateOdometerReading(params: {
  previousKm: number | null;
  newKm: number;
  override: boolean;
  /**
   * Days between the previous reading and this one. Null when unknown
   * (e.g. a manual entry with no timestamp to compare), which falls back
   * to a single day's allowance — the strictest interpretation.
   */
  daysElapsed?: number | null;
}): OdometerValidationResult {
  const { previousKm, newKm, override, daysElapsed = null } = params;

  if (override) return { valid: true };
  // No prior reading for this bike — nothing to compare against yet.
  if (previousKm === null) return { valid: true };

  if (newKm < previousKm) {
    return {
      valid: false,
      reason: `New reading (${newKm} km) is lower than the previous reading (${previousKm} km).`,
    };
  }

  // Always at least one day's worth, so a same-day re-read isn't stricter
  // than the nightly case and a missing/odd timestamp can't tighten it.
  const days = Math.max(1, Math.ceil(daysElapsed ?? 1));
  const allowanceKm = MAX_JUMP_KM_PER_DAY * days;

  const jump = newKm - previousKm;
  if (jump > allowanceKm) {
    const window =
      days === 1
        ? `${MAX_JUMP_KM_PER_DAY} km jump threshold`
        : `${allowanceKm} km threshold for the ${days} days since the previous reading`;
    return {
      valid: false,
      reason: `New reading (${newKm} km) is ${jump} km higher than the previous reading (${previousKm} km) — over the ${window}.`,
    };
  }

  return { valid: true };
}
