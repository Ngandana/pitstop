import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invites, organisations, users } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/org";

/**
 * Magic-link redirect target. Exchanges the code for a session, then
 * provisions the user's `users` row and their own organisation on first
 * login — but ONLY if the email is the platform admin or on the invite
 * list. Anyone else is signed straight back out.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const allowed = await provisionIfAllowed(data.user.id, data.user.email ?? "");
      if (!allowed) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=invite`);
      }
      const redirectPath = next.startsWith("/") && !next.startsWith("//") ? next : "/";
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

async function provisionIfAllowed(userId: string, rawEmail: string): Promise<boolean> {
  const existing = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (existing) return true;

  const email = rawEmail.trim().toLowerCase();
  if (!email) return false;

  if (!isPlatformAdmin(email)) {
    const invite = await db.query.invites.findFirst({ where: eq(invites.email, email) });
    if (!invite) return false;
  }

  await db.transaction(async (tx) => {
    // The platform admin's first login adopts the pre-existing single-tenant
    // organisation (if it has no members yet) so current data is preserved.
    let org = isPlatformAdmin(email)
      ? await tx.query.organisations.findFirst()
      : undefined;
    if (org) {
      const hasMember = await tx.query.users.findFirst({ where: eq(users.orgId, org.id) });
      if (hasMember) org = undefined;
    }
    if (!org) {
      [org] = await tx.insert(organisations).values({ name: "My Fleet" }).returning();
    }
    await tx.insert(users).values({ id: userId, orgId: org.id, email });
  });
  return true;
}
