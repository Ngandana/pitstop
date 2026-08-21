"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, rentCharges } from "@/db/schema";
import { recordPaymentSchema, waiveRentChargeSchema, voidPaymentSchema } from "@/lib/validation/money";
import { getCurrentOrg } from "@/lib/queries/org";
import { uploadPaymentProof } from "@/lib/storage";
import type { FormResult } from "@/app/(app)/fleet/actions";

function centsFromRands(rands: number): number {
  return Math.round(rands * 100);
}

export async function recordPayment(formData: FormData): Promise<FormResult> {
  const parsed = recordPaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;
  const org = await getCurrentOrg();

  const proofFile = formData.get("proof");
  const paymentId = crypto.randomUUID();
  let proofStorageKey: string | null = null;

  if (proofFile instanceof File && proofFile.size > 0) {
    try {
      proofStorageKey = await uploadPaymentProof({ paymentId, file: proofFile, contentType: "image/jpeg" });
    } catch {
      return { ok: false, error: "Proof upload failed. Check your connection and try again." };
    }
  }

  try {
    await db.insert(payments).values({
      id: paymentId,
      orgId: org.id,
      driverId: data.driverId,
      assignmentId: data.assignmentId,
      amountCents: centsFromRands(data.amountRands),
      method: data.method,
      reference: data.reference ?? null,
      paidAt: new Date(`${data.paidAt}T12:00:00Z`),
      proofStorageKey,
    });
  } catch {
    return { ok: false, error: "Couldn't save the payment. Try again." };
  }

  revalidatePath(`/drivers/${data.driverId}`);
  revalidatePath("/drivers");
  revalidatePath("/ledger");
  return { ok: true };
}

/** Soft-void exception to the append-only rule (§4): only waived_cents/waive_reason ever get touched, never amount_cents. */
export async function waiveRentCharge(
  driverId: string,
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const parsed = waiveRentChargeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const { chargeId, waivedRands, waiveReason } = parsed.data;

  const charge = await db.query.rentCharges.findFirst({ where: eq(rentCharges.id, chargeId) });
  if (!charge) return { ok: false, error: "Charge not found." };

  const waivedCents = centsFromRands(waivedRands);
  if (waivedCents > charge.amountCents) {
    return { ok: false, error: "Can't waive more than the charge amount." };
  }

  try {
    await db
      .update(rentCharges)
      .set({ waivedCents, waiveReason })
      .where(eq(rentCharges.id, chargeId));
  } catch {
    return { ok: false, error: "Couldn't save. Try again." };
  }

  revalidatePath(`/drivers/${driverId}`);
  revalidatePath("/drivers");
  revalidatePath("/ledger");
  return { ok: true };
}

/** Soft-void exception (§4): only voided_at/void_reason ever get touched, never amount_cents. */
export async function voidPayment(
  driverId: string,
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const parsed = voidPaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const { paymentId, voidReason } = parsed.data;

  const payment = await db.query.payments.findFirst({ where: eq(payments.id, paymentId) });
  if (!payment) return { ok: false, error: "Payment not found." };
  if (payment.voidedAt) return { ok: false, error: "This payment is already voided." };

  try {
    await db
      .update(payments)
      .set({ voidedAt: new Date(), voidReason })
      .where(eq(payments.id, paymentId));
  } catch {
    return { ok: false, error: "Couldn't save. Try again." };
  }

  revalidatePath(`/drivers/${driverId}`);
  revalidatePath("/drivers");
  revalidatePath("/ledger");
  return { ok: true };
}
