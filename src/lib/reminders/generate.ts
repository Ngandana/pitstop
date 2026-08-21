import "server-only";
import { and, desc, eq, isNull, like, sql } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/db";
import { drivers, reminders, users } from "@/db/schema";
import { daysUntil } from "@/lib/action-items";
import { getDriverBalances } from "@/lib/queries/money";
import { getDueServicesForOrg } from "@/lib/queries/servicing";
import { getStalledBikes } from "@/lib/queries/today";

const FLEET_TIMEZONE = "Africa/Johannesburg";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type GenerationSummary = {
  written: number;
  byTemplate: Record<string, number>;
};

/**
 * Daily reminder-generation cron body (§5). Only ever *writes* to the
 * outbox — a separate sweep cron does the sending. Every trigger writes
 * one row per channel the brief's cadence table lists for it ("Email +
 * in-app" -> two rows); in-app rows are marked sent immediately since
 * the in-app experience is the existing live Today screen, not a
 * separate inbox to deliver into later.
 *
 * cartrack_sync_failed is deliberately not handled here — it's already
 * written straight to the outbox by src/lib/telematics/sync.ts on the
 * bike's second consecutive sync failure (Milestone 3), email-only per
 * the brief, and must not be duplicated.
 */
export async function generateReminders(): Promise<GenerationSummary> {
  const org = await db.query.organisations.findFirst();
  if (!org) return { written: 0, byTemplate: {} };

  const owner = await db.query.users.findFirst({ where: eq(users.orgId, org.id) });
  if (!owner) return { written: 0, byTemplate: {} };

  // Settings' notification preferences (§7): an explicit notification
  // email overrides the login email, and the pause toggle drops the
  // email channel entirely (in-app still gets written either way — that
  // toggle is scoped to email specifically, per its own label).
  const recipient = org.notificationEmail ?? owner.email;
  const channels = org.emailRemindersEnabled ? (["email", "in_app"] as const) : (["in_app"] as const);

  const now = new Date();
  const today = formatInTimeZone(now, FLEET_TIMEZONE, "yyyy-MM-dd");
  const byTemplate: Record<string, number> = {};
  const bump = (template: string, n: number) => {
    if (n > 0) byTemplate[template] = (byTemplate[template] ?? 0) + n;
  };

  // --- Weekly rent summary: Wednesday only, one org-wide row ---
  if (formatInTimeZone(now, FLEET_TIMEZONE, "EEEE") === "Wednesday") {
    const balances = await getDriverBalances(org.id);
    const driverRows = await db.query.drivers.findMany({
      where: and(eq(drivers.orgId, org.id), isNull(drivers.deletedAt), isNull(drivers.endedAt)),
    });
    const owing = driverRows
      .map((d) => {
        const b = balances.get(d.id);
        return b ? { name: d.fullName, balanceCents: b.balanceCents, daysInArrears: b.daysInArrears } : null;
      })
      .filter((d): d is { name: string; balanceCents: number; daysInArrears: number } => d !== null && d.balanceCents > 0);

    bump(
      "weekly_rent_summary",
      await insertReminder({
        orgId: org.id,
        template: "weekly_rent_summary",
        recipient,
        channels,
        payload: { drivers: owing },
        baseDedupeKey: `weekly_rent_summary:${org.id}:${today}`,
      }),
    );
  }

  // --- Service triggers, reusing the same detection Today's cards use ---
  const dueServices = await getDueServicesForOrg(org.id);
  for (const s of dueServices) {
    const payload = {
      bikeId: s.bikeId,
      registration: s.registration,
      serviceLabel: s.label,
      kmRemaining: s.kmRemaining,
    };

    if (s.status === "warning") {
      // Once, on crossing — tied to the service baseline, so it naturally
      // resets when the next service is logged and lastServiceAt changes.
      bump(
        "service_warning",
        await insertReminder({
          orgId: org.id,
          template: "service_warning",
          recipient,
          channels,
          payload,
          baseDedupeKey: `service_warning:${s.scheduleId}:${s.lastServiceAt}`,
        }),
      );
    } else if (s.status === "due") {
      // On crossing, then every 3 days until logged.
      const last = await mostRecentReminderCreatedAt(`service_due:${s.scheduleId}:`);
      if (!last || now.getTime() - last.getTime() >= 3 * MS_PER_DAY) {
        bump(
          "service_due",
          await insertReminder({
            orgId: org.id,
            template: "service_due",
            recipient,
            channels,
            payload,
            baseDedupeKey: `service_due:${s.scheduleId}:${today}`,
          }),
        );
      }
    } else if (s.status === "overdue") {
      // Daily.
      bump(
        "service_overdue",
        await insertReminder({
          orgId: org.id,
          template: "service_overdue",
          recipient,
          channels,
          payload,
          baseDedupeKey: `service_overdue:${s.scheduleId}:${today}`,
        }),
      );
    }
  }

  // --- Licence expiring: exactly 60 / 30 / 7 days out ---
  const activeDrivers = await db.query.drivers.findMany({
    where: and(eq(drivers.orgId, org.id), isNull(drivers.deletedAt), isNull(drivers.endedAt)),
  });
  for (const driver of activeDrivers) {
    if (!driver.licenceExpiresOn) continue;
    const expiresOn = new Date(`${driver.licenceExpiresOn}T00:00:00Z`);
    const days = daysUntil(expiresOn, now);
    if (days !== 60 && days !== 30 && days !== 7) continue;

    bump(
      "licence_expiring",
      await insertReminder({
        orgId: org.id,
        template: "licence_expiring",
        recipient,
        channels,
        payload: { driverId: driver.id, driverName: driver.fullName, daysUntil: days, expiresOn: driver.licenceExpiresOn },
        baseDedupeKey: `licence_expiring:${driver.id}:${days}`,
      }),
    );
  }

  // --- Bike hasn't moved: once per occurrence (a fresh 7-day window per bike) ---
  const stalled = await getStalledBikes(org.id, now);
  for (const bike of stalled) {
    const last = await mostRecentReminderCreatedAt(`bike_not_moved:${bike.bikeId}:`);
    if (last && now.getTime() - last.getTime() < 7 * MS_PER_DAY) continue;

    bump(
      "bike_not_moved",
      await insertReminder({
        orgId: org.id,
        template: "bike_not_moved",
        recipient,
        channels,
        payload: { bikeId: bike.bikeId, registration: bike.registration, lastReadingAt: bike.lastReadingAt.toISOString() },
        baseDedupeKey: `bike_not_moved:${bike.bikeId}:${today}`,
      }),
    );
  }

  const written = Object.values(byTemplate).reduce((sum, n) => sum + n, 0);
  return { written, byTemplate };
}

/** Most recent created_at among reminders whose dedupe_key starts with `prefix`, or null. */
async function mostRecentReminderCreatedAt(prefix: string): Promise<Date | null> {
  const [row] = await db
    .select({ createdAt: reminders.createdAt })
    .from(reminders)
    .where(like(reminders.dedupeKey, `${prefix}%`))
    .orderBy(desc(reminders.createdAt))
    .limit(1);
  return row?.createdAt ?? null;
}

/**
 * Writes one row per requested channel — every call site passes the
 * org's current channel list (both "email" and "in_app" per §5's
 * cadence table, unless Settings' "pause email reminders" is on, in
 * which case just "in_app"). dedupe_key is suffixed per-channel so the
 * two rows don't collide on the outbox's shared unique index; in-app
 * rows are considered delivered the moment they're written (see module
 * doc comment).
 */
async function insertReminder(params: {
  orgId: string;
  template: (typeof reminders.$inferInsert)["template"];
  recipient: string;
  payload: unknown;
  baseDedupeKey: string;
  channels?: readonly ("email" | "in_app")[];
}): Promise<number> {
  const channels = params.channels ?? (["email", "in_app"] as const);
  let written = 0;
  for (const channel of channels) {
    const inserted = await db
      .insert(reminders)
      .values({
        orgId: params.orgId,
        template: params.template,
        channel,
        recipient: params.recipient,
        payload: params.payload,
        dedupeKey: `${params.baseDedupeKey}:${channel}`,
        sentAt: channel === "in_app" ? new Date() : null,
      })
      // reminders_dedupe is a *partial* unique index (WHERE dedupe_key IS
      // NOT NULL) — the predicate has to be repeated here or Postgres
      // can't find an arbiter index and the insert throws (42P10).
      .onConflictDoNothing({ target: reminders.dedupeKey, where: sql`${reminders.dedupeKey} IS NOT NULL` })
      .returning({ id: reminders.id });
    if (inserted.length > 0) written++;
  }
  return written;
}
