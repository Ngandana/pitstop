import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { assignments, bikes, drivers, odometerReadings } from "@/db/schema";
import type { bikeStatusEnum } from "@/db/schema";
import { daysUntil, hasBikeStalled } from "@/lib/action-items";

export type TodayBike = {
  id: string;
  registration: string;
  make: string;
  model: string;
  status: (typeof bikeStatusEnum.enumValues)[number];
  driverName: string | null;
  latestOdometerKm: number | null;
  latestOdometerAt: Date | null;
};

export type ActionItem =
  | {
      kind: "licence_expiring";
      driverId: string;
      driverName: string;
      phoneE164: string;
      expiresOn: string;
      daysUntil: number;
    }
  | {
      kind: "bike_not_moving";
      bikeId: string;
      registration: string;
      lastReadingAt: Date;
    };

export type TodayData = {
  orgName: string | null;
  bikes: TodayBike[];
  actionItems: ActionItem[];
};

/**
 * Everything the Today screen needs, in one call. Milestone 1 only wires
 * up what's genuinely available this early: bikes/drivers/odometer data,
 * and the two action-item kinds that don't depend on later milestones'
 * cron jobs (service due-calc lands in Milestone 4, rent arrears in
 * Milestone 5 — see the brief's build order).
 */
export async function getTodayData(): Promise<TodayData> {
  const org = await db.query.organisations.findFirst();
  if (!org) {
    return { orgName: null, bikes: [], actionItems: [] };
  }

  const bikeRows = await db.query.bikes.findMany({
    where: and(eq(bikes.orgId, org.id), isNull(bikes.deletedAt)),
    orderBy: (fields, { asc }) => [asc(fields.registration)],
  });

  const now = new Date();
  const actionItems: ActionItem[] = [];

  const bikeDetails = await Promise.all(
    bikeRows.map(async (bike) => {
      const [openAssignment] = await db
        .select({ driverName: drivers.fullName })
        .from(assignments)
        .innerJoin(drivers, eq(drivers.id, assignments.driverId))
        .where(and(eq(assignments.bikeId, bike.id), isNull(assignments.endedAt)))
        .limit(1);

      const readings = await db
        .select({ km: odometerReadings.readingKm, at: odometerReadings.recordedAt })
        .from(odometerReadings)
        .where(eq(odometerReadings.bikeId, bike.id))
        .orderBy(desc(odometerReadings.recordedAt))
        .limit(10);

      const latest = readings[0] as { km: number; at: Date } | undefined;

      if (openAssignment && hasBikeStalled(readings, now)) {
        actionItems.push({
          kind: "bike_not_moving",
          bikeId: bike.id,
          registration: bike.registration,
          lastReadingAt: latest!.at,
        });
      }

      const result: TodayBike = {
        id: bike.id,
        registration: bike.registration,
        make: bike.make,
        model: bike.model,
        status: bike.status,
        driverName: openAssignment?.driverName ?? null,
        latestOdometerKm: latest?.km ?? null,
        latestOdometerAt: latest?.at ?? null,
      };
      return result;
    }),
  );

  const activeDrivers = await db.query.drivers.findMany({
    where: and(eq(drivers.orgId, org.id), isNull(drivers.deletedAt), isNull(drivers.endedAt)),
  });

  for (const driver of activeDrivers) {
    if (!driver.licenceExpiresOn) continue;
    const expiresOn = new Date(`${driver.licenceExpiresOn}T00:00:00Z`);
    const days = daysUntil(expiresOn, now);
    if (days <= 60) {
      actionItems.push({
        kind: "licence_expiring",
        driverId: driver.id,
        driverName: driver.fullName,
        phoneE164: driver.phoneE164,
        expiresOn: driver.licenceExpiresOn,
        daysUntil: days,
      });
    }
  }

  actionItems.sort((a, b) => {
    const rank = (item: ActionItem) => (item.kind === "licence_expiring" ? item.daysUntil : 999);
    return rank(a) - rank(b);
  });

  return { orgName: org.name, bikes: bikeDetails, actionItems };
}
