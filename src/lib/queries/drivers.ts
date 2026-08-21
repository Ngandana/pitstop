import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { assignments, bikes, drivers } from "@/db/schema";
import { getDriverBalances } from "@/lib/queries/money";

export type DriverListRow = {
  id: string;
  fullName: string;
  phoneE164: string;
  licenceExpiresOn: string | null;
  bikeRegistration: string | null;
  balanceCents: number;
  daysInArrears: number;
};

export async function listDrivers(orgId: string): Promise<DriverListRow[]> {
  const driverRows = await db.query.drivers.findMany({
    where: and(eq(drivers.orgId, orgId), isNull(drivers.deletedAt)),
    orderBy: (fields, { asc }) => [asc(fields.fullName)],
  });

  const balances = await getDriverBalances(orgId);

  return Promise.all(
    driverRows.map(async (driver) => {
      const [openAssignment] = await db
        .select({ registration: bikes.registration })
        .from(assignments)
        .innerJoin(bikes, eq(bikes.id, assignments.bikeId))
        .where(and(eq(assignments.driverId, driver.id), isNull(assignments.endedAt)))
        .limit(1);

      const balance = balances.get(driver.id);

      return {
        id: driver.id,
        fullName: driver.fullName,
        phoneE164: driver.phoneE164,
        licenceExpiresOn: driver.licenceExpiresOn,
        bikeRegistration: openAssignment?.registration ?? null,
        balanceCents: balance?.balanceCents ?? 0,
        daysInArrears: balance?.daysInArrears ?? 0,
      };
    }),
  );
}

export async function getDriverDetail(driverId: string) {
  const driver = await db.query.drivers.findFirst({ where: eq(drivers.id, driverId) });
  if (!driver) return null;

  const assignmentRows = await db
    .select({
      id: assignments.id,
      bikeId: assignments.bikeId,
      bikeRegistration: bikes.registration,
      startedAt: assignments.startedAt,
      endedAt: assignments.endedAt,
      endReason: assignments.endReason,
      weeklyRentCents: assignments.weeklyRentCents,
      depositCents: assignments.depositCents,
      startOdometerKm: assignments.startOdometerKm,
      endOdometerKm: assignments.endOdometerKm,
    })
    .from(assignments)
    .innerJoin(bikes, eq(bikes.id, assignments.bikeId))
    .where(eq(assignments.driverId, driverId))
    .orderBy(desc(assignments.startedAt));

  const openAssignment = assignmentRows.find((a) => a.endedAt === null) ?? null;

  return { driver, openAssignment, assignments: assignmentRows };
}
