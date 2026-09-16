"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { drivers } from "@/db/schema";
import { driverFormSchema } from "@/lib/validation/drivers";
import { getCurrentOrg } from "@/lib/queries/org";
import { deleteDriverPhoto, uploadDriverPhoto } from "@/lib/storage";
import type { FormResult } from "@/app/(app)/fleet/actions";

/** A present-but-empty file input still submits a zero-byte File — treat that as "no photo". */
function extractPhoto(formData: FormData): File | null {
  const file = formData.get("photo");
  return file instanceof File && file.size > 0 ? file : null;
}

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
  const photo = extractPhoto(formData);

  // The photo is keyed by driverId (see uploadDriverPhoto), which doesn't
  // exist until the insert below — generate it up front rather than
  // inserting first and uploading second, so a failed upload can't leave
  // a driver row with no way to retry attaching the photo to it.
  const driverId = crypto.randomUUID();

  let photoStorageKey: string | null = null;
  if (photo) {
    try {
      photoStorageKey = await uploadDriverPhoto({
        driverId,
        file: photo,
        contentType: "image/jpeg",
      });
    } catch {
      return { ok: false, error: "Photo upload failed. Check your connection and try again." };
    }
  }

  try {
    await db.insert(drivers).values({
      id: driverId,
      orgId: org.id,
      fullName: data.fullName,
      phoneE164: data.phoneE164,
      licenceNumber: data.licenceNumber ?? null,
      licenceExpiresOn: data.licenceExpiresOn ?? null,
      notes: data.notes ?? null,
      photoStorageKey,
    });
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
  const photo = extractPhoto(formData);
  const removePhoto = formData.get("removePhoto") === "true";

  // undefined = leave the stored key alone (the common case: the photo
  // field wasn't touched). Only set it when there's an actual change, so
  // a plain "edit the phone number" save can't accidentally wipe a photo.
  let photoStorageKey: string | null | undefined;

  if (photo) {
    try {
      // upsert: true in uploadDriverPhoto overwrites any existing object
      // at this driver's key, so no separate delete is needed for a
      // replacement — only a straight removal needs one, below.
      photoStorageKey = await uploadDriverPhoto({ driverId, file: photo, contentType: "image/jpeg" });
    } catch {
      return { ok: false, error: "Photo upload failed. Check your connection and try again." };
    }
  } else if (removePhoto) {
    const existing = await db.query.drivers.findFirst({
      where: eq(drivers.id, driverId),
      columns: { photoStorageKey: true },
    });
    if (existing?.photoStorageKey) {
      try {
        await deleteDriverPhoto(existing.photoStorageKey);
      } catch {
        return { ok: false, error: "Couldn't remove the photo. Try again." };
      }
    }
    photoStorageKey = null;
  }

  try {
    await db
      .update(drivers)
      .set({
        fullName: data.fullName,
        phoneE164: data.phoneE164,
        licenceNumber: data.licenceNumber ?? null,
        licenceExpiresOn: data.licenceExpiresOn ?? null,
        notes: data.notes ?? null,
        ...(photoStorageKey !== undefined ? { photoStorageKey } : {}),
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
