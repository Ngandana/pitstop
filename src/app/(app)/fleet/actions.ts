"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bikes, bikeStatusHistory, odometerReadings } from "@/db/schema";
import { bikeFormSchema, bikeStatusChangeSchema, manualOdometerSchema } from "@/lib/validation/bikes";
import { getCurrentOrg } from "@/lib/queries/org";
import { createDefaultServiceSchedules } from "@/lib/servicing/schedules";
import { changeBikeStatus } from "@/lib/bikes/status";
import { validateOdometerReading } from "@/lib/telematics/validate-odometer";

export type FormResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

function centsFromRands(rands: number | null | undefined): number | null {
  if (rands === null || rands === undefined) return null;
  return Math.round(rands * 100);
}

export async function createBike(_prev: FormResult | null, formData: FormData): Promise<FormResult> {
  const parsed = bikeFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }

  const org = await getCurrentOrg();
  const data = parsed.data;

  // registration is unique per org — surface a clean error instead of a raw DB one.
  const clash = await db.query.bikes.findFirst({
    where: (b, { and, eq, isNull }) =>
      and(eq(b.orgId, org.id), eq(b.registration, data.registration), isNull(b.deletedAt)),
  });
  if (clash) {
    return {
      ok: false,
      error: "A bike with that registration already exists.",
      fieldErrors: { registration: "Already registered" },
    };
  }

  let bikeId: string;
  try {
    bikeId = await db.transaction(async (tx) => {
      const [bike] = await tx
        .insert(bikes)
        .values({
          orgId: org.id,
          registration: data.registration,
          make: data.make,
          model: data.model,
          engineCc: data.engineCc ?? null,
          year: data.year ?? null,
          colour: data.colour ?? null,
          vin: data.vin ?? null,
          purchaseDate: data.purchaseDate ?? null,
          purchasePriceCents: centsFromRands(data.purchasePriceRands),
          cartrackVehicleId: data.cartrackVehicleId ?? null,
        })
        .returning();

      await tx.insert(bikeStatusHistory).values({
        bikeId: bike.id,
        fromStatus: null,
        toStatus: "unassigned",
        reason: "Bike registered",
      });

      await tx.insert(odometerReadings).values({
        orgId: org.id,
        bikeId: bike.id,
        readingKm: data.initialOdometerKm,
        source: "manual",
      });

      await createDefaultServiceSchedules(tx, {
        orgId: org.id,
        bikeId: bike.id,
        currentOdometerKm: data.initialOdometerKm,
      });

      return bike.id;
    });
  } catch {
    return { ok: false, error: "Couldn't save the bike. Try again." };
  }

  revalidatePath("/fleet");
  revalidatePath("/");
  redirect(`/fleet/${bikeId}`);
}

export async function updateBike(
  bikeId: string,
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const parsed = bikeFormSchema.omit({ initialOdometerKm: true }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }

  const org = await getCurrentOrg();
  const data = parsed.data;

  const clash = await db.query.bikes.findFirst({
    where: (b, { and, eq, isNull, ne }) =>
      and(
        eq(b.orgId, org.id),
        eq(b.registration, data.registration),
        isNull(b.deletedAt),
        ne(b.id, bikeId),
      ),
  });
  if (clash) {
    return {
      ok: false,
      error: "A bike with that registration already exists.",
      fieldErrors: { registration: "Already registered" },
    };
  }

  try {
    await db
      .update(bikes)
      .set({
        registration: data.registration,
        make: data.make,
        model: data.model,
        engineCc: data.engineCc ?? null,
        year: data.year ?? null,
        colour: data.colour ?? null,
        vin: data.vin ?? null,
        purchaseDate: data.purchaseDate ?? null,
        purchasePriceCents: centsFromRands(data.purchasePriceRands),
        cartrackVehicleId: data.cartrackVehicleId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(bikes.id, bikeId));
  } catch {
    return { ok: false, error: "Couldn't save the bike. Try again." };
  }

  revalidatePath("/fleet");
  revalidatePath(`/fleet/${bikeId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function updateBikeStatus(
  bikeId: string,
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const parsed = bikeStatusChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid status." };
  }

  // Off-road/stolen/written-off transitions matter enough downstream
  // (arrears waiving, insurance) that a reason is required, not optional.
  const REASON_REQUIRED = new Set(["off_road", "stolen", "written_off"]);
  if (REASON_REQUIRED.has(parsed.data.status) && !parsed.data.reason) {
    return { ok: false, error: "A reason is required for this status." };
  }

  try {
    await db.transaction(async (tx) => {
      await changeBikeStatus(tx, {
        bikeId,
        toStatus: parsed.data.status,
        reason: parsed.data.reason,
      });
    });
  } catch {
    return { ok: false, error: "Couldn't update status. Try again." };
  }

  revalidatePath(`/fleet/${bikeId}`);
  revalidatePath("/fleet");
  revalidatePath("/");
  return { ok: true };
}

/** §5 fallback path: the owner enters a reading by hand when Cartrack can't. */
export async function recordManualOdometerReading(
  bikeId: string,
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const parsed = manualOdometerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid reading." };
  }
  const override = formData.get("override") === "on";

  const org = await getCurrentOrg();
  const [latest] = await db
    .select({ km: odometerReadings.readingKm })
    .from(odometerReadings)
    .where(eq(odometerReadings.bikeId, bikeId))
    .orderBy(desc(odometerReadings.recordedAt))
    .limit(1);

  const validation = validateOdometerReading({
    previousKm: latest?.km ?? null,
    newKm: parsed.data.readingKm,
    override,
  });
  if (!validation.valid) {
    return {
      ok: false,
      error: `${validation.reason} Tick "I'm sure this is correct" to save it anyway.`,
    };
  }

  try {
    await db.insert(odometerReadings).values({
      orgId: org.id,
      bikeId,
      readingKm: parsed.data.readingKm,
      source: "manual",
      overrideFlag: override,
    });
  } catch {
    return { ok: false, error: "Couldn't save the reading. Try again." };
  }

  revalidatePath(`/fleet/${bikeId}`);
  revalidatePath("/fleet");
  revalidatePath("/");
  return { ok: true };
}
