import {
  bigint,
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { bikes } from "./bikes";
import { organisations } from "./organisations";

/** Org-wide catalogue of service kinds. Seeded with the 125cc defaults in §5. */
export const serviceTypes = pgTable("service_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  code: text("code").notNull(),
  label: text("label").notNull(),
  defaultIntervalKm: integer("default_interval_km").notNull(),
  defaultMaxIntervalDays: integer("default_max_interval_days").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Per-bike override of a service type's interval — auto-created for every
 * active service type when a bike is registered (last_service_km = the
 * bike's current odometer, last_service_at = today), then editable per §5.
 *
 * `km_to_next_service` and the 0.8/1.0/1.2 progress thresholds are computed
 * from this table at read time — never stored (§4, "Never store a derived
 * value").
 */
export const serviceSchedules = pgTable("service_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  bikeId: uuid("bike_id")
    .notNull()
    .references(() => bikes.id),
  serviceTypeId: uuid("service_type_id")
    .notNull()
    .references(() => serviceTypes.id),
  intervalKm: integer("interval_km").notNull(),
  maxIntervalDays: integer("max_interval_days").notNull(),
  lastServiceKm: integer("last_service_km").notNull(),
  lastServiceAt: date("last_service_at").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A completed-service record only — no quote or approval workflow (§4).
 * Append-only: corrections are new rows.
 */
export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  bikeId: uuid("bike_id")
    .notNull()
    .references(() => bikes.id),
  serviceTypeId: uuid("service_type_id")
    .notNull()
    .references(() => serviceTypes.id),
  odometerKm: integer("odometer_km").notNull(),
  performedAt: date("performed_at").notNull(),
  costCents: bigint("cost_cents", { mode: "number" }),
  workshopName: text("workshop_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
