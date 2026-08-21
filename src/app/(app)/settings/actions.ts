"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organisations, serviceTypes } from "@/db/schema";
import {
  updateNotificationPreferencesSchema,
  updateRentPolicySchema,
  updateServiceTypeSchema,
} from "@/lib/validation/settings";
import { getCurrentOrg } from "@/lib/queries/org";
import type { FormResult } from "@/app/(app)/fleet/actions";

function centsFromRands(rands: number | null | undefined): number | null {
  if (rands === null || rands === undefined) return null;
  return Math.round(rands * 100);
}

/**
 * §7 Settings: "service interval defaults" — the org-wide template new
 * bikes' schedules are seeded from (src/lib/servicing/schedules.ts).
 * Editing here never touches existing bikes' own service_schedules rows
 * — those are per-bike overrides, only ScheduleEditForm (/fleet/[id])
 * changes them.
 */
export async function updateServiceType(
  serviceTypeId: string,
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const parsed = updateServiceTypeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the values." };
  }

  try {
    await db
      .update(serviceTypes)
      .set({
        label: parsed.data.label,
        defaultIntervalKm: parsed.data.defaultIntervalKm,
        defaultMaxIntervalDays: parsed.data.defaultMaxIntervalDays,
      })
      .where(eq(serviceTypes.id, serviceTypeId));
  } catch {
    return { ok: false, error: "Couldn't save. Try again." };
  }

  revalidatePath("/settings");
  return { ok: true };
}

/** §7 Settings: "rent policy defaults" — pre-fills /assignments/new, never required there. */
export async function updateRentPolicy(_prev: FormResult | null, formData: FormData): Promise<FormResult> {
  const parsed = updateRentPolicySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the values." };
  }

  const org = await getCurrentOrg();
  try {
    await db
      .update(organisations)
      .set({
        defaultWeeklyRentCents: centsFromRands(parsed.data.weeklyRentRands),
        defaultDepositCents: centsFromRands(parsed.data.depositRands),
        updatedAt: new Date(),
      })
      .where(eq(organisations.id, org.id));
  } catch {
    return { ok: false, error: "Couldn't save. Try again." };
  }

  revalidatePath("/settings");
  revalidatePath("/assignments/new");
  return { ok: true };
}

/** §7 Settings: "my notification preferences". */
export async function updateNotificationPreferences(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  // An unchecked checkbox sends no key at all — translate presence to a
  // real boolean before validating (see the schema's doc comment).
  const parsed = updateNotificationPreferencesSchema.safeParse({
    notificationEmail: formData.get("notificationEmail"),
    emailRemindersEnabled: formData.has("emailRemindersEnabled"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the values." };
  }

  const org = await getCurrentOrg();
  try {
    await db
      .update(organisations)
      .set({
        notificationEmail: parsed.data.notificationEmail,
        emailRemindersEnabled: parsed.data.emailRemindersEnabled,
        updatedAt: new Date(),
      })
      .where(eq(organisations.id, org.id));
  } catch {
    return { ok: false, error: "Couldn't save. Try again." };
  }

  revalidatePath("/settings");
  return { ok: true };
}
