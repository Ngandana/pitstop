import "server-only";
import { createClient } from "@supabase/supabase-js";

const HANDOVER_BUCKET = "handover-photos";
const PAYMENT_PROOF_BUCKET = "payment-proofs";

/**
 * Admin client, service-role key — never imported from client code
 * (the `server-only` import above throws a build error if it is).
 * Storage writes/signed-url generation both need elevated access since
 * the bucket is private.
 */
function storageAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase URL/service role key not configured.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function uploadHandoverPhoto(params: {
  assignmentId: string;
  phase: "handover" | "return";
  angle: string;
  file: Blob;
  contentType: string;
}): Promise<string> {
  const key = `${params.assignmentId}/${params.phase}/${params.angle}.jpg`;
  const { error } = await storageAdmin()
    .storage.from(HANDOVER_BUCKET)
    .upload(key, params.file, { contentType: params.contentType, upsert: true });
  if (error) {
    throw new Error(`Photo upload failed (${params.angle}): ${error.message}`);
  }
  return key;
}

/** Signed URL, short-lived — the bucket is private (§ handover photos can show a driver's face). */
export async function getHandoverPhotoUrl(storageKey: string, expiresInSeconds = 300) {
  const { data, error } = await storageAdmin()
    .storage.from(HANDOVER_BUCKET)
    .createSignedUrl(storageKey, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function uploadPaymentProof(params: {
  paymentId: string;
  file: Blob;
  contentType: string;
}): Promise<string> {
  const key = `${params.paymentId}.jpg`;
  const { error } = await storageAdmin()
    .storage.from(PAYMENT_PROOF_BUCKET)
    .upload(key, params.file, { contentType: params.contentType, upsert: true });
  if (error) {
    throw new Error(`Proof upload failed: ${error.message}`);
  }
  return key;
}

/** Signed URL, short-lived — a proof-of-payment screenshot can carry a driver's phone number, banking app UI, etc. */
export async function getPaymentProofUrl(storageKey: string, expiresInSeconds = 300) {
  const { data, error } = await storageAdmin()
    .storage.from(PAYMENT_PROOF_BUCKET)
    .createSignedUrl(storageKey, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}
