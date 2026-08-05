import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organisations, users } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link redirect target. Exchanges the code for a session, then
 * just-in-time provisions the owner's `users` row and the (single) org
 * on first-ever login — there's no signup screen, so this is the only
 * place those rows get created.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      await ensureOwnerUserRow(data.user.id, data.user.email ?? "");
      const redirectPath = next.startsWith("/") ? next : "/";
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

async function ensureOwnerUserRow(userId: string, email: string) {
  const existing = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (existing) return;

  let org = await db.query.organisations.findFirst();
  if (!org) {
    [org] = await db
      .insert(organisations)
      .values({ name: "My Fleet" })
      .returning();
  }

  await db.insert(users).values({ id: userId, orgId: org.id, email });
}
