"use server";

import { createClient } from "@/lib/supabase/server";
import { magicLinkRequestSchema } from "@/lib/validation/auth";

export type MagicLinkResult = { ok: true } | { ok: false; error: string };

/**
 * Single-owner account: only the configured OWNER_EMAIL may request a
 * magic link. Any other address gets the same generic response either
 * way, so this doesn't double as an email-enumeration oracle. (Format
 * validation errors below are about input shape, not account existence,
 * so returning them directly doesn't reopen that oracle.)
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

  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (!ownerEmail || email !== ownerEmail) {
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
