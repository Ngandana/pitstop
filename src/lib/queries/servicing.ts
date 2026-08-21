import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bikes, odometerReadings, serviceSchedules, serviceTypes } from "@/db/schema";
import {
  calculateServiceProgress,
  kmToNextService,
  serviceStatusFromProgress,
  type ServiceStatus,
} from "@/lib/servicing/due-calc";

export type ServiceScheduleStatus = {
  scheduleId: string;
  bikeId: string;
  registration: string;
  serviceTypeId: string;
  label: string;
  intervalKm: number;
  maxIntervalDays: number;
  lastServiceKm: number;
  lastServiceAt: string;
  currentKm: number | null;
  progress: number;
  status: ServiceStatus;
  kmRemaining: number | null;
};

async function latestOdometerKm(bikeId: string): Promise<number | null> {
  const [latest] = await db
    .select({ km: odometerReadings.readingKm })
    .from(odometerReadings)
    .where(eq(odometerReadings.bikeId, bikeId))
    .orderBy(desc(odometerReadings.recordedAt))
    .limit(1);
  return latest?.km ?? null;
}

function toStatus(
  schedule: {
    id: string;
    bikeId: string;
    serviceTypeId: string;
    intervalKm: number;
    maxIntervalDays: number;
    lastServiceKm: number;
    lastServiceAt: string;
  },
  registration: string,
  label: string,
  currentKm: number | null,
  now: Date,
): ServiceScheduleStatus {
  const lastServiceAt = new Date(`${schedule.lastServiceAt}T00:00:00Z`);
  const progress = calculateServiceProgress({
    currentKm,
    lastServiceKm: schedule.lastServiceKm,
    intervalKm: schedule.intervalKm,
    lastServiceAt,
    maxIntervalDays: schedule.maxIntervalDays,
    asOf: now,
  });

  return {
    scheduleId: schedule.id,
    bikeId: schedule.bikeId,
    registration,
    serviceTypeId: schedule.serviceTypeId,
    label,
    intervalKm: schedule.intervalKm,
    maxIntervalDays: schedule.maxIntervalDays,
    lastServiceKm: schedule.lastServiceKm,
    lastServiceAt: schedule.lastServiceAt,
    currentKm,
    progress,
    status: serviceStatusFromProgress(progress),
    kmRemaining: kmToNextService({
      currentKm,
      lastServiceKm: schedule.lastServiceKm,
      intervalKm: schedule.intervalKm,
    }),
  };
}

export async function getServiceStatusesForBike(bikeId: string): Promise<ServiceScheduleStatus[]> {
  const bike = await db.query.bikes.findFirst({ where: eq(bikes.id, bikeId) });
  if (!bike) return [];

  const schedules = await db
    .select({
      id: serviceSchedules.id,
      bikeId: serviceSchedules.bikeId,
      serviceTypeId: serviceSchedules.serviceTypeId,
      intervalKm: serviceSchedules.intervalKm,
      maxIntervalDays: serviceSchedules.maxIntervalDays,
      lastServiceKm: serviceSchedules.lastServiceKm,
      lastServiceAt: serviceSchedules.lastServiceAt,
      label: serviceTypes.label,
    })
    .from(serviceSchedules)
    .innerJoin(serviceTypes, eq(serviceTypes.id, serviceSchedules.serviceTypeId))
    .where(and(eq(serviceSchedules.bikeId, bikeId), eq(serviceSchedules.active, true)));

  const currentKm = await latestOdometerKm(bikeId);
  const now = new Date();

  return schedules
    .map((s) => toStatus(s, bike.registration, s.label, currentKm, now))
    .sort((a, b) => b.progress - a.progress);
}

/** The single most urgent (highest-progress) active schedule per bike — for the fleet list's "km to next service" column. */
export async function getMostUrgentServiceStatusPerBike(
  orgId: string,
): Promise<Map<string, ServiceScheduleStatus>> {
  const bikeRows = await db.query.bikes.findMany({ where: eq(bikes.orgId, orgId) });
  const result = new Map<string, ServiceScheduleStatus>();

  for (const bike of bikeRows) {
    const statuses = await getServiceStatusesForBike(bike.id);
    if (statuses[0]) result.set(bike.id, statuses[0]);
  }

  return result;
}

/** Every schedule at warning-or-worse, across the whole org — for Today's action items. */
export async function getDueServicesForOrg(orgId: string): Promise<ServiceScheduleStatus[]> {
  const bikeRows = await db.query.bikes.findMany({ where: eq(bikes.orgId, orgId) });
  const results: ServiceScheduleStatus[] = [];

  for (const bike of bikeRows) {
    const statuses = await getServiceStatusesForBike(bike.id);
    for (const s of statuses) {
      if (s.status !== "ok") results.push(s);
    }
  }

  return results.sort((a, b) => b.progress - a.progress);
}
