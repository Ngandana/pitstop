import { notFound } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { invites, users } from "@/db/schema";
import { isPlatformAdmin } from "@/lib/queries/org";
import { createClient } from "@/lib/supabase/server";
import { addInvite, removeInvite } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isPlatformAdmin(user?.email)) notFound();

  const [list, members] = await Promise.all([
    db.select().from(invites).orderBy(desc(invites.invitedAt)),
    db.select({ email: users.email }).from(users),
  ]);
  const joined = new Set(members.map((m) => m.email.toLowerCase()));

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-hero text-foreground">Invites</h1>
      <p className="text-sm text-text-secondary">
        RideStack is invite-only. Add an email here, then tell the person to open the app and sign in with
        it. Each person gets their own empty fleet that nobody else can see.
      </p>

      <form action={addInvite} className="flex flex-col gap-2 rounded-xl border border-border bg-surface-raised p-4">
        <input
          name="email"
          type="email"
          required
          placeholder="friend@example.com"
          className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
        />
        <input
          name="note"
          placeholder="Who is this? (optional)"
          className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
        />
        <button
          type="submit"
          className="h-11 cursor-pointer rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Invite
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {list.map((i) => (
          <li
            key={i.email}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{i.email}</p>
              <p className="text-xs text-text-muted">
                {joined.has(i.email) ? "Joined" : "Not signed in yet"}
                {i.note ? ` · ${i.note}` : ""}
              </p>
            </div>
            <form action={removeInvite}>
              <input type="hidden" name="email" value={i.email} />
              <button type="submit" className="cursor-pointer text-xs font-medium text-danger">
                Remove
              </button>
            </form>
          </li>
        ))}
        {list.length === 0 ? <li className="text-sm text-text-muted">No invites yet.</li> : null}
      </ul>
    </div>
  );
}
