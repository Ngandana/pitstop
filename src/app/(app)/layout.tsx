import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AppShell } from "@/components/app-shell/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A Supabase session alone isn't membership: someone who signed up through
  // Supabase's public endpoint (bypassing our invite check) has no `users`
  // row and must not reach any data.
  if (user) {
    const member = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { id: true },
    });
    if (!member) redirect("/not-invited");
  }

  return <AppShell userEmail={user?.email ?? null}>{children}</AppShell>;
}
