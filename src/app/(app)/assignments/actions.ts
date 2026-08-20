"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { assignments, drivers, handoverPhotos, odometerReadings } from "@/db/schema";
import {
  HANDOVER_PHOTO_ANGLES,
  assignmentFormSchema,
  endAssignmentSchema,
} from "@/lib/validation/assignments";
import { changeBikeStatus } from "@/lib/bikes/status";
import { getCurrentOrg } from "@/lib/queries/org";
import { uploadHandoverPhoto } from "@/lib/storage";
import type { FormResult } from "@/app/(app)/fleet/actions";

export async function createAssignment(formData: FormData): Promise<FormResult> {
  const parsed = assignmentFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;

  const photoFiles: Record<string, File> = {};
  for (const angle of HANDOVER_PHOTO_ANGLES) {
    const file = formData.get(`photo_${angle}`);
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: `Missing the ${angle} photo.` };
    }
    photoFiles[angle] = file;
  }

  const org = await getCurrentOrg();

  const [bikeTaken, driverTaken, driver] = await Promise.all([
    db.query.assignments.findFirst({
      where: and(eq(assignments.bikeId, data.bikeId), isNull(assignments.endedAt)),
    }),
    db.query.assignments.findFirst({
      where: and(eq(assignments.driverId, data.driverId), isNull(assignments.endedAt)),
    }),
    db.query.drivers.findFirst({ where: eq(drivers.id, data.driverId) }),
  ]);
  if (bikeTaken) return { ok: false, error: "This bike already has an open assignment." };
  if (driverTaken) return { ok: false, error: "This driver already has an open assignment." };
  if (!driver) return { ok: false, error: "Driver not found." };

  const assignmentId = crypto.randomUUID();

  let uploadedKeys: { angle: string; key: string }[];
  try {
    uploadedKeys = await Promise.all(
      HANDOVER_PHOTO_ANGLES.map(async (angle) => ({
        angle,
        key: await uploadHandoverPhoto({
          assignmentId,
          phase: "handover",
          angle,
          file: photoFiles[angle],
          contentType: "image/jpeg",
        }),
      })),
    );
  } catch {
    return { ok: false, error: "Photo upload failed. Check your connection and try again." };
  }

  const startedAt = new Date();
  try {
    await db.transaction(async (tx) => {
      await tx.insert(assignments).values({
        id: assignmentId,
        orgId: org.id,
        bikeId: data.bikeId,
        driverId: data.driverId,
        startedAt,
        weeklyRentCents: Math.round(data.weeklyRentRands * 100),
        depositCents: Math.round(data.depositRands * 100),
        startOdometerKm: data.startOdometerKm,
        rentDueWeekday: data.rentDueWeekday,
        notes: data.notes ?? null,
      });

      await tx.insert(handoverPhotos).values(
        uploadedKeys.map(({ angle, key }) => ({
          assignmentId,
          phase: "handover" as const,
          angle: angle as (typeof HANDOVER_PHOTO_ANGLES)[number],
          storageKey: key,
          takenAt: startedAt,
        })),
      );

      await tx.insert(odometerReadings).values({
        orgId: org.id,
        bikeId: data.bikeId,
        readingKm: data.startOdometerKm,
        source: "handover",
        recordedAt: startedAt,
      });

      await changeBikeStatus(tx, {
        bikeId: data.bikeId,
        toStatus: "active",
        reason: `Assigned to ${driver.fullName}`,
        changedAt: startedAt,
      });
    });
  } catch {
    return { ok: false, error: "Couldn't save the assignment. Try again." };
  }

  revalidatePath(`/fleet/${data.bikeId}`);
  revalidatePath("/fleet");
  revalidatePath(`/drivers/${data.driverId}`);
  revalidatePath("/drivers");
  revalidatePath("/");
  redirect(`/fleet/${data.bikeId}`);
}

export async function endAssignment(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const parsed = endAssignmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const { assignmentId, endOdometerKm, endReason } = parsed.data;

  const assignment = await db.query.assignments.findFirst({
    where: eq(assignments.id, assignmentId),
  });
  if (!assignment) {
    return { ok: false, error: "Assignment not found." };
  }
  if (assignment.endedAt) {
    return { ok: false, error: "This assignment has already ended." };
  }
  if (endOdometerKm < assignment.startOdometerKm) {
    return {
      ok: false,
      error: `End odometer can't be lower than the starting reading (${assignment.startOdometerKm} km).`,
    };
  }

  const endedAt = new Date();

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(assignments)
        .set({ endedAt, endOdometerKm, endReason, updatedAt: endedAt })
        .where(eq(assignments.id, assignmentId));

      await tx.insert(odometerReadings).values({
        orgId: assignment.orgId,
        bikeId: assignment.bikeId,
        readingKm: endOdometerKm,
        source: "handover",
        recordedAt: endedAt,
      });

      await changeBikeStatus(tx, {
        bikeId: assignment.bikeId,
        toStatus: "unassigned",
        reason: `Assignment ended: ${endReason}`,
        changedAt: endedAt,
      });
    });
  } catch {
    return { ok: false, error: "Couldn't end the assignment. Try again." };
  }

  revalidatePath(`/fleet/${assignment.bikeId}`);
  revalidatePath("/fleet");
  revalidatePath(`/drivers/${assignment.driverId}`);
  revalidatePath("/drivers");
  revalidatePath("/");
  return { ok: true };
}
