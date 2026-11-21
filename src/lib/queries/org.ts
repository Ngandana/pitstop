import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organisations, users } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

/**
 * Multi-owner: the organisation is the one the *signed-in user* belongs to.
 * Everything downstream (every query and action) scopes by the returned
 * org.id, so this is the single choke point for tenant isolation.
 *
 * A Supabase session with no `users` row (e.g. someone who hit Supabase's
 * public sign-up endpoint directly) is NOT a member of anything and gets
 * an error — membership is only ever created by the invite-checked
 * callback (src/app/auth/callback/route.ts).
 */
export const getCurrentOrg = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const member = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  if (!member) throw new Error("This account hasn't been invited.");

  const org = await db.query.organisations.findFirst({
    where: eq(organisations.id, member.orgId),
  });
  if (!org) throw new Error("Organisation not found.");
  return org;
});

/** Platform admin = OWNER_EMAIL. Can manage the invite list. */
export function isPlatformAdmin(email: string | null | undefined) {
  const admin = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return !!admin && !!email && email.trim().toLowerCase() === admin;
}
