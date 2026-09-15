import {
  bigint,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { bikeStatusEnum } from "./enums";
import { organisations } from "./organisations";

export const bikes = pgTable(
  "bikes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organisations.id),
    registration: text("registration").notNull(),
    make: text("make").notNull(),
    model: text("model").notNull(),
    engineCc: integer("engine_cc"),
    year: integer("year"),
    colour: text("colour"),
    vin: text("vin"),
    purchaseDate: date("purchase_date"),
    /** Integer cents, bigint column. Never a float — see §3. */
    purchasePriceCents: bigint("purchase_price_cents", { mode: "number" }),
    /** Cartrack's vehicle id for the nightly telematics sync. Null until linked. */
    cartrackVehicleId: text("cartrack_vehicle_id"),
    /**
     * Added to every provider-reported odometer value to get the bike's real
     * lifetime kilometres: `appKm = providerKm + odometerOffsetKm`.
     *
     * A replaced tracker starts counting from zero, so without this the bike
     * appears to lose its entire history overnight and the sync jams on the
     * backwards reading. This is stored configuration, not a derived value —
     * it's a fact about the hardware fitted to the bike, and it only changes
     * when a tracker is swapped (see re-baselining in src/lib/telematics).
     */
    odometerOffsetKm: integer("odometer_offset_km").notNull().default(0),
    status: bikeStatusEnum("status").notNull().default("unassigned"),
    /** Soft delete — bikes keep their full history even once sold/written off. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("bikes_org_registration_unique").on(table.orgId, table.registration),
  ],
);

/**
 * How bike downtime is measured — every status change writes a row here.
 * Never make the owner log downtime manually; it's derived from this table.
 */
export const bikeStatusHistory = pgTable("bike_status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  bikeId: uuid("bike_id")
    .notNull()
    .references(() => bikes.id),
  fromStatus: bikeStatusEnum("from_status"),
  toStatus: bikeStatusEnum("to_status").notNull(),
  reason: text("reason"),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
