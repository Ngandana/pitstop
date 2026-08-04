import {
  bigint,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { bikes } from "./bikes";
import { drivers } from "./drivers";
import { organisations } from "./organisations";
import { handoverPhotoAngleEnum, handoverPhotoPhaseEnum } from "./enums";

export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organisations.id),
    bikeId: uuid("bike_id")
      .notNull()
      .references(() => bikes.id),
    driverId: uuid("driver_id")
      .notNull()
      .references(() => drivers.id),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    endReason: text("end_reason"),
    weeklyRentCents: bigint("weekly_rent_cents", { mode: "number" }).notNull(),
    /** ISO weekday-ish: 0=Sunday .. 6=Saturday. Default 3 = Wednesday, per §4. */
    rentDueWeekday: integer("rent_due_weekday").notNull().default(3),
    depositCents: bigint("deposit_cents", { mode: "number" }).notNull().default(0),
    startOdometerKm: integer("start_odometer_km").notNull(),
    endOdometerKm: integer("end_odometer_km"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // A bike can only be actively handed to one driver at a time, and vice
    // versa. Partial unique indexes on ended_at IS NULL enforce this at the
    // DB layer — see §4, "Constraints that matter".
    uniqueIndex("one_open_assignment_per_bike")
      .on(table.bikeId)
      .where(sql`${table.endedAt} IS NULL`),
    uniqueIndex("one_open_assignment_per_driver")
      .on(table.driverId)
      .where(sql`${table.endedAt} IS NULL`),
  ],
);

/**
 * The six condition photos taken at handover (and again at return) —
 * the one non-negotiable extra in v1 (§7). Never update in place.
 */
export const handoverPhotos = pgTable("handover_photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  assignmentId: uuid("assignment_id")
    .notNull()
    .references(() => assignments.id),
  phase: handoverPhotoPhaseEnum("phase").notNull(),
  angle: handoverPhotoAngleEnum("angle").notNull(),
  storageKey: text("storage_key").notNull(),
  takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
