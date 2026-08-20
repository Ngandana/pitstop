import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { bikes } from "./bikes";
import { organisations } from "./organisations";

/**
 * Append-only log of every telematics sync attempt per bike. Exists
 * solely so "two consecutive failures" (§5's Cartrack alerting rule) is
 * detectable at all — a failed pull otherwise leaves no row anywhere,
 * and the nightly cron is a fresh, stateless invocation each run.
 */
export const telematicsSyncLog = pgTable("telematics_sync_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  bikeId: uuid("bike_id")
    .notNull()
    .references(() => bikes.id),
  /** 'cartrack' today; the TelematicsProvider interface allows more later. */
  provider: text("provider").notNull(),
  succeeded: boolean("succeeded").notNull(),
  error: text("error"),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
});
