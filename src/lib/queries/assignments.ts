import { and, eq, isNull, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { assignments, bikes, drivers } from "@/db/schema";

/** Bikes/drivers with no open assignment — the only valid picks for a new one. */
export async function getAvailableBikesAndDrivers(orgId: string) {
  const openAssignments = await db
    .select({ bikeId: assignments.bikeId, driverId: assignments.driverId })
    .from(assignments)
    .where(isNull(assignments.endedAt));

  const takenBikeIds = openAssignments.map((a) => a.bikeId);
  const takenDriverIds = openAssignments.map((a) => a.driverId);

  const [availableBikes, availableDrivers] = await Promise.all([
    db.query.bikes.findMany({
      where: and(
        eq(bikes.orgId, orgId),
        isNull(bikes.deletedAt),
        takenBikeIds.length > 0 ? notInArray(bikes.id, takenBikeIds) : undefined,
      ),
      orderBy: (fields, { asc }) => [asc(fields.registration)],
    }),
    db.query.drivers.findMany({
      where: and(
        eq(drivers.orgId, orgId),
        isNull(drivers.deletedAt),
        takenDriverIds.length > 0 ? notInArray(drivers.id, takenDriverIds) : undefined,
      ),
      orderBy: (fields, { asc }) => [asc(fields.fullName)],
    }),
  ]);

  return { availableBikes, availableDrivers };
}
