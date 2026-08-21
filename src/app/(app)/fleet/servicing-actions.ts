"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { odometerReadings, serviceSchedules, services } from "@/db/schema";
import { logServiceSchema, updateServiceScheduleSchema } from "@/lib/validation/servicing";
import { validateOdometerReading } from "@/lib/telematics/validate-odometer";
import { getCurrentOrg } from "@/lib/queries/org";
import type { FormResult } from "./actions";

function centsFromRands(rands: number | null | undefined): number | null {
  if (rands === null || rands === undefined) return null;
  return Math.round(rands * 100);
}

function todaySAST(): string {
  // Africa/Johannesburg has no DST — a fixed +2h offset is always correct.
  const sast = new Date(Date.now() + 2 * 60 * 60 * 1000);
  return sast.toISOString().slice(0, 10);
}

/**
 * A completed-service record only — no quote or approval workflow (§4).
 * Inserts the append-only `services` fact, moves the matching
 * service_schedule's baseline forward, and — only when logged for
 * today — records a corroborating odometer_readings row (source
 * 'service'). A backdated entry skips that last step: inserting an old
 * reading after newer ones exist would look like the odometer went
 * backwards, which is exactly what the validation rule exists to catch.
 */
export async function logService(
  bikeId: string,
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const parsed = logServiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;
  const override = formData.get("override") === "on";

  const org = await getCurrentOrg();
  const schedule = await db.query.serviceSchedules.findFirst({
    where: and(eq(serviceSchedules.bikeId, bikeId), eq(serviceSchedules.serviceTypeId, data.serviceTypeId)),
  });
  if (!schedule) {
    return { ok: false, error: "No schedule found for this service type on this bike." };
  }

  const isToday = data.performedAt === todaySAST();

  if (isToday) {
    const [latest] = await db
      .select({ km: odometerReadings.readingKm })
      .from(odometerReadings)
      .where(eq(odometerReadings.bikeId, bikeId))
      .orderBy(desc(odometerReadings.recordedAt))
      .limit(1);

    const validation = validateOdometerReading({
      previousKm: latest?.km ?? null,
      newKm: data.odometerKm,
      override,
    });
    if (!validation.valid) {
      return {
        ok: false,
        error: `${validation.reason} Tick "I'm sure this is correct" to log it anyway.`,
      };
    }
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(services).values({
        orgId: org.id,
        bikeId,
        serviceTypeId: data.serviceTypeId,
        odometerKm: data.odometerKm,
        performedAt: data.performedAt,
        costCents: centsFromRands(data.costRands),
        workshopName: data.workshopName ?? null,
        notes: data.notes ?? null,
      });

      if (isToday) {
        await tx.insert(odometerReadings).values({
          orgId: org.id,
          bikeId,
          readingKm: data.odometerKm,
          source: "service",
          overrideFlag: override,
        });
      }

      await tx
        .update(serviceSchedules)
        .set({ lastServiceKm: data.odometerKm, lastServiceAt: data.performedAt, updatedAt: new Date() })
        .where(eq(serviceSchedules.id, schedule.id));
    });
  } catch {
    return { ok: false, error: "Couldn't log the service. Try again." };
  }

  revalidatePath(`/fleet/${bikeId}`);
  revalidatePath("/fleet");
  revalidatePath("/");
  return { ok: true };
}

/** §5: "Let me edit any of them per bike." Per-bike override of a service type's interval. */
export async function updateServiceSchedule(
  scheduleId: string,
  bikeId: string,
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const parsed = updateServiceScheduleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the values." };
  }

  try {
    await db
      .update(serviceSchedules)
      .set({
        intervalKm: parsed.data.intervalKm,
        maxIntervalDays: parsed.data.maxIntervalDays,
        updatedAt: new Date(),
      })
      .where(eq(serviceSchedules.id, scheduleId));
  } catch {
    return { ok: false, error: "Couldn't save. Try again." };
  }

  revalidatePath(`/fleet/${bikeId}`);
  revalidatePath("/fleet");
  revalidatePath("/");
  return { ok: true };
}
