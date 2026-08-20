/**
 * Creates the Supabase Storage bucket handover photos are uploaded to.
 * Idempotent — safe to re-run. Run with: npm run storage:setup
 *
 * Private bucket: handover photos can include a driver's face, vehicle
 * registration, and existing-damage close-ups. Reads go through signed
 * URLs (src/lib/storage.ts), not a public bucket URL.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const BUCKET = "handover-photos";

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) throw listError;

  if (buckets.some((b) => b.name === BUCKET)) {
    console.log(`Bucket "${BUCKET}" already exists.`);
    return;
  }

  const { error: createError } = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: "1MB", // photos are compressed client-side to <300KB before upload
    allowedMimeTypes: ["image/jpeg", "image/webp", "image/png"],
  });
  if (createError) throw createError;

  console.log(`Created bucket "${BUCKET}".`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Storage setup failed:", error);
    process.exit(1);
  });
