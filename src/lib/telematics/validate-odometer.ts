/**
 * §5's Cartrack sync validation rule: "reject a reading that is lower
 * than the previous one, or more than 500 km higher, unless
 * override_flag is set. Log it and surface it to me — do not silently
 * accept or silently drop." This function only decides valid/invalid;
 * the caller is responsible for logging/surfacing a rejection.
 */
const MAX_JUMP_KM = 500;

export type OdometerValidationResult = { valid: true } | { valid: false; reason: string };

export function validateOdometerReading(params: {
  previousKm: number | null;
  newKm: number;
  override: boolean;
}): OdometerValidationResult {
  const { previousKm, newKm, override } = params;

  if (override) return { valid: true };
  // No prior reading for this bike — nothing to compare against yet.
  if (previousKm === null) return { valid: true };

  if (newKm < previousKm) {
    return {
      valid: false,
      reason: `New reading (${newKm} km) is lower than the previous reading (${previousKm} km).`,
    };
  }

  const jump = newKm - previousKm;
  if (jump > MAX_JUMP_KM) {
    return {
      valid: false,
      reason: `New reading (${newKm} km) is ${jump} km higher than the previous reading (${previousKm} km) — over the ${MAX_JUMP_KM} km jump threshold.`,
    };
  }

  return { valid: true };
}
