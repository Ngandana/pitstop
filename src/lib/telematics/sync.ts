import "server-only";
import { desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { bikes, odometerReadings, organisations, reminders, telematicsSyncLog, users } from "@/db/schema";
import { validateOdometerReading } from "./validate-odometer";
import type { TelematicsProvider } from "./types";

export type SyncOutcome = {
  bikeId: string;
  registration: string;
  status: "synced" | "rejected" | "failed" | "skipped";
  detail: string;
};

/**
 * One bike, one sync attempt. Every outcome — success, rejection, or
 * fetch failure — is written to telematics_sync_log; only a *valid*
 * successful fetch ever touches odometer_readings (§5: never silently
 * accept or silently drop a bad reading).
 */
export async function syncBikeOdometer(params: {
  bike: { id: string; orgId: string; registration: string; cartrackVehicleId: string | null };
  provider: TelematicsProvider;
}): Promise<SyncOutcome> {
  const { bike, provider } = params;

  if (!bike.cartrackVehicleId) {
    return {
      bikeId: bike.id,
      registration: bike.registration,
      status: "skipped",
      detail: "No cartrack_vehicle_id set.",
    };
  }

  const [latest] = await db
    .select({ km: odometerReadings.readingKm })
    .from(odometerReadings)
    .where(eq(odometerReadings.bikeId, bike.id))
    .orderBy(desc(odometerReadings.recordedAt))
    .limit(1);
  const previousKm = latest?.km ?? null;

  const result = await provider.fetchOdometerReading(bike.cartrackVehicleId);

  if (!result.ok) {
    await logSyncAttempt({
      orgId: bike.orgId,
      bikeId: bike.id,
      provider: provider.name,
      succeeded: false,
      error: result.error,
    });
    await maybeAlertOnConsecutiveFailures(bike);
    return { bikeId: bike.id, registration: bike.registration, status: "failed", detail: result.error };
  }

  const validation = validateOdometerReading({ previousKm, newKm: result.km, override: false });
  if (!validation.valid) {
    await logSyncAttempt({
      orgId: bike.orgId,
      bikeId: bike.id,
      provider: provider.name,
      succeeded: false,
      error: `Rejected: ${validation.reason}`,
    });
    await maybeAlertOnConsecutiveFailures(bike);
    return {
      bikeId: bike.id,
      registration: bike.registration,
      status: "rejected",
      detail: validation.reason,
    };
  }

  await db.insert(odometerReadings).values({
    orgId: bike.orgId,
    bikeId: bike.id,
    readingKm: result.km,
    source: "cartrack",
    recordedAt: result.recordedAt,
    rawPayload: result.raw,
  });
  await logSyncAttempt({
    orgId: bike.orgId,
    bikeId: bike.id,
    provider: provider.name,
    succeeded: true,
    error: null,
  });

  return {
    bikeId: bike.id,
    registration: bike.registration,
    status: "synced",
    detail: `${result.km} km`,
  };
}

/** Every bike with a cartrack_vehicle_id, one at a time (fleet is small; no need for concurrency limits). */
export async function syncAllBikes(provider: TelematicsProvider): Promise<SyncOutcome[]> {
  const bikeRows = await db.query.bikes.findMany({ where: isNull(bikes.deletedAt) });
  const results: SyncOutcome[] = [];
  for (const bike of bikeRows) {
    if (!bike.cartrackVehicleId) continue;
    results.push(await syncBikeOdometer({ bike, provider }));
  }
  return results;
}

async function logSyncAttempt(params: {
  orgId: string;
  bikeId: string;
  provider: string;
  succeeded: boolean;
  error: string | null;
}) {
  await db.insert(telematicsSyncLog).values(params);
}

/**
 * §5: "Alert me by email after two consecutive sync failures for the
 * same bike." Fires exactly once per failure streak (on the run where
 * the streak reaches 2, not every night it stays failed) by keying
 * dedupe_key to the streak's start date. Writes to the reminders outbox
 * only — actual sending is the sweep cron in Milestone 6.
 */
async function maybeAlertOnConsecutiveFailures(bike: {
  id: string;
  orgId: string;
  registration: string;
}) {
  const recent = await db
    .select({ succeeded: telematicsSyncLog.succeeded, attemptedAt: telematicsSyncLog.attemptedAt })
    .from(telematicsSyncLog)
    .where(eq(telematicsSyncLog.bikeId, bike.id))
    .orderBy(desc(telematicsSyncLog.attemptedAt))
    .limit(2);

  if (recent.length < 2 || recent.some((r) => r.succeeded)) return;

  const org = await db.query.organisations.findFirst({ where: eq(organisations.id, bike.orgId) });
  // This trigger is email-only (§5's cadence table — no in-app row to
  // fall back to), so "pause email reminders" means don't write it at
  // all, unlike the other triggers in src/lib/reminders/generate.ts.
  if (!org || !org.emailRemindersEnabled) return;

  const owner = await db.query.users.findFirst({ where: eq(users.orgId, bike.orgId) });
  if (!owner) return;

  const streakStart = recent[1].attemptedAt.toISOString().slice(0, 10);
  await db
    .insert(reminders)
    .values({
      orgId: bike.orgId,
      template: "cartrack_sync_failed",
      channel: "email",
      recipient: org.notificationEmail ?? owner.email,
      payload: { bikeId: bike.id, registration: bike.registration },
      dedupeKey: `cartrack-sync-failed-${bike.id}-${streakStart}`,
    })
    // reminders_dedupe is a *partial* unique index (WHERE dedupe_key IS NOT
    // NULL) — onConflictDoNothing needs the matching predicate here or
    // Postgres can't find an arbiter index and the insert throws (42P10).
    .onConflictDoNothing({ target: reminders.dedupeKey, where: sql`${reminders.dedupeKey} IS NOT NULL` });
}
