"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { assignments, odometerReadings } from "@/db/schema";
import { endAssignmentSchema } from "@/lib/validation/assignments";
import { changeBikeStatus } from "@/lib/bikes/status";
import type { FormResult } from "@/app/(app)/fleet/actions";

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
