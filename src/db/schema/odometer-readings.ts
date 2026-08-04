import { boolean, integer, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { bikes } from "./bikes";
import { odometerSourceEnum } from "./enums";
import { organisations } from "./organisations";

/**
 * Append-only fact table (§4). Never update a reading in place — a
 * correction is a new row, or a soft void with a reason. This is the
 * audit trail the km-to-service math is built on.
 */
export const odometerReadings = pgTable("odometer_readings", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  bikeId: uuid("bike_id")
    .notNull()
    .references(() => bikes.id),
  readingKm: integer("reading_km").notNull(),
  source: odometerSourceEnum("source").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  /** Set when a reading fails the monotonic/500km-jump validation but was
   *  accepted anyway (owner override) — see §5 Cartrack sync validation. */
  overrideFlag: boolean("override_flag").notNull().default(false),
  /** Full raw provider response, for debugging bad readings later. */
  rawPayload: jsonb("raw_payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
