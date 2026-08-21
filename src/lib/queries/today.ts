import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { assignments, bikes, drivers, odometerReadings } from "@/db/schema";
import type { bikeStatusEnum } from "@/db/schema";
import { daysUntil, hasBikeStalled } from "@/lib/action-items";
import { getDueServicesForOrg, getMostUrgentServiceStatusPerBike } from "@/lib/queries/servicing";
import { getDriverBalances } from "@/lib/queries/money";
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
      driverId: string;
      driverName: string;
      phoneE164: string;
    }
  | {
      kind: "service";
      scheduleId: string;
      bikeId: string;
      registration: string;
      serviceLabel: string;
      status: Extract<ServiceStatus, "warning" | "due" | "overdue">;
      kmRemaining: number | null;
      /** Only set when a driver is currently riding this bike. */
      driverId: string | null;
      driverName: string | null;
      phoneE164: string | null;
    }
  | {
      kind: "arrears";
      driverId: string;
      driverName: string;
      phoneE164: string;
      balanceCents: number;
      daysInArrears: number;
    };

export type TodayData = {
  orgName: string | null;
  bikes: TodayBike[];
  actionItems: ActionItem[];
};

export type StalledBike = { bikeId: string; registration: string; lastReadingAt: Date };

/**
 * Bikes with an open assignment whose odometer hasn't moved in 48h+
 * (§5's "bike hasn't moved" trigger) — the same detection getTodayData
 * uses inline for its bike_not_moving action item, factored out here so
 * the reminder generator (Milestone 6) can reuse it instead of
 * re-deriving the rule.
 */
export async function getStalledBikes(orgId: string, now: Date): Promise<StalledBike[]> {
  const bikeRows = await db.query.bikes.findMany({
    where: and(eq(bikes.orgId, orgId), isNull(bikes.deletedAt)),
  });

  const result: StalledBike[] = [];
  for (const bike of bikeRows) {
    const [openAssignment] = await db
      .select({ id: assignments.id })
      .from(assignments)
      .where(and(eq(assignments.bikeId, bike.id), isNull(assignments.endedAt)))
      .limit(1);
    if (!openAssignment) continue;

    const readings = await db
      .select({ km: odometerReadings.readingKm, at: odometerReadings.recordedAt })
      .from(odometerReadings)
      .where(eq(odometerReadings.bikeId, bike.id))
      .orderBy(desc(odometerReadings.recordedAt))
      .limit(10);
    if (readings.length === 0) continue;

    if (hasBikeStalled(readings, now)) {
      result.push({ bikeId: bike.id, registration: bike.registration, lastReadingAt: readings[0].at });
    }
  }
  return result;
}

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
  const assignedDriverByBike = new Map<string, { driverId: string; driverName: string; phoneE164: string }>();

  const bikeDetails = await Promise.all(
    bikeRows.map(async (bike) => {
      const [openAssignment] = await db
        .select({ driverId: drivers.id, driverName: drivers.fullName, phoneE164: drivers.phoneE164 })
        .from(assignments)
        .innerJoin(drivers, eq(drivers.id, assignments.driverId))
        .where(and(eq(assignments.bikeId, bike.id), isNull(assignments.endedAt)))
        .limit(1);
      if (openAssignment) assignedDriverByBike.set(bike.id, openAssignment);

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
          driverId: openAssignment.driverId,
          driverName: openAssignment.driverName,
          phoneE164: openAssignment.phoneE164,
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

  const balances = await getDriverBalances(org.id);
  for (const driver of activeDrivers) {
    const balance = balances.get(driver.id);
    if (!balance || balance.daysInArrears <= 0) continue;
    actionItems.push({
      kind: "arrears",
      driverId: driver.id,
      driverName: driver.fullName,
      phoneE164: driver.phoneE164,
      balanceCents: balance.balanceCents,
      daysInArrears: balance.daysInArrears,
    });
  }

  const dueServices = await getDueServicesForOrg(org.id);
  for (const s of dueServices) {
    if (s.status === "ok") continue;
    const assignedDriver = assignedDriverByBike.get(s.bikeId) ?? null;
    actionItems.push({
      kind: "service",
      scheduleId: s.scheduleId,
      bikeId: s.bikeId,
      registration: s.registration,
      serviceLabel: s.label,
      status: s.status,
      driverId: assignedDriver?.driverId ?? null,
      driverName: assignedDriver?.driverName ?? null,
      phoneE164: assignedDriver?.phoneE164 ?? null,
      kmRemaining: s.kmRemaining,
    });
  }

  // Urgency order: a stranded/overdue bike outranks everything else, then
  // due services, then arrears (worse the longer it's gone on), then a
  // bike that's gone quiet, then licences (soonest first), then services
  // that are merely trending toward due.
  const KIND_RANK: Record<string, number> = {
    "service:overdue": 0,
    "service:due": 1,
    arrears: 2,
    bike_not_moving: 3,
    licence_expiring: 4,
    "service:warning": 5,
  };
  const rank = (item: ActionItem) => {
    if (item.kind === "service") return KIND_RANK[`service:${item.status}`];
    if (item.kind === "licence_expiring") return KIND_RANK.licence_expiring + item.daysUntil / 1000;
    if (item.kind === "arrears") return KIND_RANK.arrears - item.daysInArrears / 1000;
    return KIND_RANK[item.kind];
  };
  actionItems.sort((a, b) => rank(a) - rank(b));

  return { orgName: org.name, bikes: bikeDetails, actionItems };
}
