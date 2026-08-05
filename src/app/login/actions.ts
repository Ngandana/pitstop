"use server";

import { createClient } from "@/lib/supabase/server";

export type MagicLinkResult = { ok: true } | { ok: false; error: string };

/**
 * Single-owner account: only the configured OWNER_EMAIL may request a
 * magic link. Any other address gets the same generic response either
 * way, so this doesn't double as an email-enumeration oracle.
 */
export async function requestMagicLink(
  _prev: MagicLinkResult | null,
  formData: FormData,
): Promise<MagicLinkResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { ok: false, error: "Enter your email address." };
  }

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
