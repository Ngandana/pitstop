"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invites } from "@/db/schema";
import { isPlatformAdmin } from "@/lib/queries/org";
import { createClient } from "@/lib/supabase/server";
import { magicLinkRequestSchema } from "@/lib/validation/auth";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isPlatformAdmin(user?.email)) throw new Error("Not allowed.");
}

export async function addInvite(formData: FormData) {
  await requireAdmin();
  const parsed = magicLinkRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return;
  const note = String(formData.get("note") ?? "").trim().slice(0, 100) || null;
  await db
    .insert(invites)
    .values({ email: parsed.data.email.toLowerCase(), note })
    .onConflictDoNothing();
  revalidatePath("/admin");
}

export async function removeInvite(formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").toLowerCase();
  await db.delete(invites).where(eq(invites.email, email));
  revalidatePath("/admin");
}
