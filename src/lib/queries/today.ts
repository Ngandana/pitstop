import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { assignments, bikes, drivers, odometerReadings } from "@/db/schema";
import type { bikeStatusEnum } from "@/db/schema";
import { daysUntil, hasBikeStalled } from "@/lib/action-items";
import { getDueServicesForOrg, getMostUrgentServiceStatusPerBike } from "@/lib/queries/servicing";
import type { ServiceStatus } from "@/lib/servicing/due-calc";

export type TodayBike = {
  id: string;
  registration: string;
  make: string;
  model: string;
  status: (typeof bikeStatusEnum.enumValues)[number];
  driverName: string | null;
  latestOdometerKm: number | null;
  latestOdometerAt: Date | null;
  nextService: {
    label: string;
    status: ServiceStatus;
    kmRemaining: number | null;
  } | null;
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
    }
  | {
      kind: "service";
      bikeId: string;
      registration: string;
      serviceLabel: string;
      status: Extract<ServiceStatus, "warning" | "due" | "overdue">;
      kmRemaining: number | null;
    };

export type TodayData = {
  orgName: string | null;
  bikes: TodayBike[];
  actionItems: ActionItem[];
};

/** Everything the Today screen needs, in one call. */
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

  const nextServiceByBike = await getMostUrgentServiceStatusPerBike(org.id);

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

      const nextService = nextServiceByBike.get(bike.id);

      const result: TodayBike = {
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

  const dueServices = await getDueServicesForOrg(org.id);
  for (const s of dueServices) {
    if (s.status === "ok") continue;
    actionItems.push({
      kind: "service",
      bikeId: s.bikeId,
      registration: s.registration,
      serviceLabel: s.label,
      status: s.status,
      kmRemaining: s.kmRemaining,
    });
  }

  // Urgency order: a stranded/overdue bike outranks everything else, then
  // due services, then a bike that's gone quiet, then licences (soonest
  // first), then services that are merely trending toward due.
  const KIND_RANK: Record<string, number> = {
    "service:overdue": 0,
    "service:due": 1,
    bike_not_moving: 2,
    licence_expiring: 3,
    "service:warning": 4,
  };
  const rank = (item: ActionItem) => {
    if (item.kind === "service") return KIND_RANK[`service:${item.status}`];
    if (item.kind === "licence_expiring") return KIND_RANK.licence_expiring + item.daysUntil / 1000;
    return KIND_RANK[item.kind];
  };
  actionItems.sort((a, b) => rank(a) - rank(b));

  return { orgName: org.name, bikes: bikeDetails, actionItems };
}
