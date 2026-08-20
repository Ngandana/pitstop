"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { drivers } from "@/db/schema";
import { driverFormSchema } from "@/lib/validation/drivers";
import { getCurrentOrg } from "@/lib/queries/org";
import type { FormResult } from "@/app/(app)/fleet/actions";

export async function createDriver(_prev: FormResult | null, formData: FormData): Promise<FormResult> {
  const parsed = driverFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }

  const org = await getCurrentOrg();
  const data = parsed.data;

  let driverId: string;
  try {
    const [driver] = await db
      .insert(drivers)
      .values({
        orgId: org.id,
        fullName: data.fullName,
        phoneE164: data.phoneE164,
        licenceNumber: data.licenceNumber ?? null,
        licenceExpiresOn: data.licenceExpiresOn ?? null,
        notes: data.notes ?? null,
      })
      .returning();
    driverId = driver.id;
  } catch {
    return { ok: false, error: "Couldn't save the driver. Try again." };
  }

  revalidatePath("/drivers");
  revalidatePath("/");
  redirect(`/drivers/${driverId}`);
}

export async function updateDriver(
  driverId: string,
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const parsed = driverFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }

  const data = parsed.data;
  try {
    await db
      .update(drivers)
      .set({
        fullName: data.fullName,
        phoneE164: data.phoneE164,
        licenceNumber: data.licenceNumber ?? null,
        licenceExpiresOn: data.licenceExpiresOn ?? null,
        notes: data.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(drivers.id, driverId));
  } catch {
    return { ok: false, error: "Couldn't save the driver. Try again." };
  }

  revalidatePath("/drivers");
  revalidatePath(`/drivers/${driverId}`);
  revalidatePath("/");
  return { ok: true };
}
