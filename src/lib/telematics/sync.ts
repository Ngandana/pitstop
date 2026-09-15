import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
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
  bike: {
    id: string;
    orgId: string;
    registration: string;
    cartrackVehicleId: string | null;
    odometerOffsetKm: number;
  };
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
    .select({ km: odometerReadings.readingKm, recordedAt: odometerReadings.recordedAt })
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

  const daysElapsed = latest
    ? (result.recordedAt.getTime() - latest.recordedAt.getTime()) / 86_400_000
    : null;

  // The provider reports what its tracker has counted; the bike's real
  // lifetime total is that plus the offset carried over from any previous
  // tracker. Everything downstream — validation, storage, service due-calc —
  // works in the bike's scale, never the tracker's.
  const readingKm = result.km + bike.odometerOffsetKm;

  const validation = validateOdometerReading({
    previousKm,
    newKm: readingKm,
    override: false,
    daysElapsed,
  });
  if (!validation.valid) {
    // A replaced tracker restarts its odometer near zero, which looks
    // identical to a corrupt backwards reading. Saying so turns an opaque
    // rejection into an actionable one: the fix is to re-baseline the bike
    // via manual entry with "override" ticked, not to chase a data fault.
    const reason = `${validation.reason}${await trackerSwapHint(bike.id, result.deviceId)}`;
    await logSyncAttempt({
      orgId: bike.orgId,
      bikeId: bike.id,
      provider: provider.name,
      succeeded: false,
      error: `Rejected: ${reason}`,
    });
    await maybeAlertOnConsecutiveFailures(bike);
    return {
      bikeId: bike.id,
      registration: bike.registration,
      status: "rejected",
      detail: reason,
    };
  }

  await db.insert(odometerReadings).values({
    orgId: bike.orgId,
    bikeId: bike.id,
    readingKm,
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
    detail: `${readingKm} km`,
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

/**
 * Compares the tracker that produced this reading against the one behind
 * the bike's last stored Cartrack reading. Returns a sentence to append to
 * a rejection reason, or "" when there's nothing useful to say (no device
 * id from the provider, no prior payload, or the same device as before).
 *
 * Reads the serial back out of the stored raw payload rather than adding a
 * column — rawPayload is kept precisely so questions like this can be
 * answered after the fact, and this avoids a schema change.
 */
async function trackerSwapHint(bikeId: string, currentDeviceId: string | null): Promise<string> {
  if (!currentDeviceId) return "";

  const [previous] = await db
    .select({ rawPayload: odometerReadings.rawPayload })
    .from(odometerReadings)
    .where(and(eq(odometerReadings.bikeId, bikeId), eq(odometerReadings.source, "cartrack")))
    .orderBy(desc(odometerReadings.recordedAt))
    .limit(1);
  if (!previous) return "";

  const previousDeviceId = extractTerminalSerial(previous.rawPayload);
  if (!previousDeviceId || previousDeviceId === currentDeviceId) return "";

  return ` The tracker appears to have been replaced (was ${previousDeviceId}, now ${currentDeviceId}), which restarts the odometer — re-baseline this bike with a manual reading and "override" ticked.`;
}

/** Digs terminal_serial out of either raw payload shape the client stores. */
function extractTerminalSerial(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  // Odometer-endpoint shape: { data: { terminal_serial } }
  const direct = (root.data as Record<string, unknown> | undefined)?.terminal_serial;
  if (typeof direct === "string" && direct) return direct;
  // Trips-fallback shape: { odometerResponse: { data: { terminal_serial } } }
  const nested = (
    (root.odometerResponse as Record<string, unknown> | undefined)?.data as
      | Record<string, unknown>
      | undefined
  )?.terminal_serial;
  return typeof nested === "string" && nested ? nested : null;
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
