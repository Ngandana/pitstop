import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  assignments,
  bikeStatusHistory,
  bikes,
  drivers,
  odometerReadings,
  serviceTypes,
  services,
  telematicsSyncLog,
} from "@/db/schema";
import type { TodayBike } from "@/lib/queries/today";
import { getMostUrgentServiceStatusPerBike, getServiceStatusesForBike } from "@/lib/queries/servicing";

/** Bike list for /fleet — same shape as the Today screen's fleet cards. */
export async function listBikes(orgId: string): Promise<TodayBike[]> {
  const bikeRows = await db.query.bikes.findMany({
    where: and(eq(bikes.orgId, orgId), isNull(bikes.deletedAt)),
    orderBy: (fields, { asc }) => [asc(fields.registration)],
  });

  const nextServiceByBike = await getMostUrgentServiceStatusPerBike(orgId);

  return Promise.all(
    bikeRows.map(async (bike) => {
      const [openAssignment] = await db
        .select({ driverName: drivers.fullName })
        .from(assignments)
        .innerJoin(drivers, eq(drivers.id, assignments.driverId))
        .where(and(eq(assignments.bikeId, bike.id), isNull(assignments.endedAt)))
        .limit(1);

      const [latest] = await db
        .select({ km: odometerReadings.readingKm, at: odometerReadings.recordedAt })
        .from(odometerReadings)
        .where(eq(odometerReadings.bikeId, bike.id))
        .orderBy(desc(odometerReadings.recordedAt))
        .limit(1);

      const nextService = nextServiceByBike.get(bike.id);

      return {
        id: bike.id,
        registration: bike.registration,
        make: bike.make,
        model: bike.model,
        status: bike.status,
        driverName: openAssignment?.driverName ?? null,
        latestOdometerKm: latest?.km ?? null,
        latestOdometerAt: latest?.at ?? null,
        nextService: nextService
          ? { label: nextService.label, status: nextService.status, kmRemaining: nextService.kmRemaining }
          : null,
      };
    }),
  );
}

export async function getBikeDetail(bikeId: string) {
  const bike = await db.query.bikes.findFirst({ where: eq(bikes.id, bikeId) });
  if (!bike) return null;

  const [assignmentRows, statusHistory, recentReadings, schedules, lastSyncAttempt, serviceHistory] =
    await Promise.all([
    db
      .select({
        id: assignments.id,
        driverId: assignments.driverId,
        driverName: drivers.fullName,
        startedAt: assignments.startedAt,
        endedAt: assignments.endedAt,
        endReason: assignments.endReason,
        weeklyRentCents: assignments.weeklyRentCents,
        depositCents: assignments.depositCents,
        startOdometerKm: assignments.startOdometerKm,
        endOdometerKm: assignments.endOdometerKm,
      })
      .from(assignments)
      .innerJoin(drivers, eq(drivers.id, assignments.driverId))
      .where(eq(assignments.bikeId, bikeId))
      .orderBy(desc(assignments.startedAt)),
    db
      .select()
      .from(bikeStatusHistory)
      .where(eq(bikeStatusHistory.bikeId, bikeId))
      .orderBy(desc(bikeStatusHistory.changedAt)),
    db
      .select()
      .from(odometerReadings)
      .where(eq(odometerReadings.bikeId, bikeId))
      .orderBy(desc(odometerReadings.recordedAt))
      .limit(90), // enough history for the mileage chart; the list view only shows the first 10
    getServiceStatusesForBike(bikeId),
    db
      .select()
      .from(telematicsSyncLog)
      .where(eq(telematicsSyncLog.bikeId, bikeId))
      .orderBy(desc(telematicsSyncLog.attemptedAt))
      .limit(1),
    db
      .select({
        id: services.id,
        label: serviceTypes.label,
        odometerKm: services.odometerKm,
        performedAt: services.performedAt,
        costCents: services.costCents,
        workshopName: services.workshopName,
        notes: services.notes,
      })
      .from(services)
      .innerJoin(serviceTypes, eq(serviceTypes.id, services.serviceTypeId))
      .where(eq(services.bikeId, bikeId))
      .orderBy(desc(services.performedAt))
      .limit(20),
  ]);

  const openAssignment = assignmentRows.find((a) => a.endedAt === null) ?? null;
  const latestOdometer = recentReadings[0] ?? null;

  return {
    bike,
    openAssignment,
    assignments: assignmentRows,
    statusHistory,
    recentReadings,
    schedules,
    serviceHistory,
    latestOdometerKm: latestOdometer?.readingKm ?? null,
    lastSyncAttempt: lastSyncAttempt[0] ?? null,
  };
}
