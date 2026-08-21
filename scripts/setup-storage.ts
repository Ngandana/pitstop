/**
 * Creates the private Supabase Storage buckets the app uploads photos to.
 * Idempotent — safe to re-run. Run with: npm run storage:setup
 *
 * Both are private: handover photos can include a driver's face, vehicle
 * registration, and existing-damage close-ups; payment proofs can show a
 * driver's phone number or banking app UI. Reads go through signed URLs
 * (src/lib/storage.ts), never a public bucket URL.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const BUCKETS = ["handover-photos", "payment-proofs"];

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

  for (const bucket of BUCKETS) {
    if (buckets.some((b) => b.name === bucket)) {
      console.log(`Bucket "${bucket}" already exists.`);
      continue;
    }

    const { error: createError } = await admin.storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: "1MB", // photos are compressed client-side to <300KB before upload
      allowedMimeTypes: ["image/jpeg", "image/webp", "image/png"],
    });
    if (createError) throw createError;

    console.log(`Created bucket "${bucket}".`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Storage setup failed:", error);
    process.exit(1);
  });
