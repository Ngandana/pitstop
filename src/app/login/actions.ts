"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invites } from "@/db/schema";
import { isPlatformAdmin } from "@/lib/queries/org";
import { createClient } from "@/lib/supabase/server";
import { magicLinkRequestSchema } from "@/lib/validation/auth";

export type MagicLinkResult = { ok: true } | { ok: false; error: string };

/**
 * Invite-only: only the platform admin (OWNER_EMAIL) or an invited email may
 * request a magic link. Anyone else gets the same generic response either
 * way, so this doesn't double as an email-enumeration oracle. (Format
 * validation errors are about input shape, not account existence.)
 */
export async function requestMagicLink(
  _prev: MagicLinkResult | null,
  formData: FormData,
): Promise<MagicLinkResult> {
  const parsed = magicLinkRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const { email } = parsed.data;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const invited =
    isPlatformAdmin(email) ||
    !!(await db.query.invites.findFirst({ where: eq(invites.email, email.toLowerCase()) }));

  if (!invited) {
    // Deliberately identical to the success path — see doc comment above.
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    return { ok: false, error: "Couldn't send the link. Try again in a moment." };
  }

  return { ok: true };
}
