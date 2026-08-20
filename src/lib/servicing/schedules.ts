import { eq } from "drizzle-orm";
import type { db as Db } from "@/db";
import { serviceSchedules, serviceTypes } from "@/db/schema";

/**
 * §5: "When a new bike is created, auto-create a service_schedule row per
 * [service type] using these defaults, with last_service_km = the bike's
 * current odometer and last_service_at = today." Each created row is
 * itself active (service_schedules.active) — service_types has no active
 * flag of its own in §4's schema, every type in the catalogue applies.
 */
export async function createDefaultServiceSchedules(
  tx: Pick<typeof Db, "insert" | "query">,
  params: { orgId: string; bikeId: string; currentOdometerKm: number; asOf?: Date },
) {
  const types = await tx.query.serviceTypes.findMany({
    where: eq(serviceTypes.orgId, params.orgId),
  });
  if (types.length === 0) return [];

  const asOf = params.asOf ?? new Date();
  const lastServiceAt = asOf.toISOString().slice(0, 10);

  const rows = types.map((type) => ({
    orgId: params.orgId,
    bikeId: params.bikeId,
    serviceTypeId: type.id,
    intervalKm: type.defaultIntervalKm,
    maxIntervalDays: type.defaultMaxIntervalDays,
    lastServiceKm: params.currentOdometerKm,
    lastServiceAt,
    active: true,
  }));

  await tx.insert(serviceSchedules).values(rows);
  return rows;
}
