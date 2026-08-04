import { date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organisations } from "./organisations";

export const drivers = pgTable("drivers", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  fullName: text("full_name").notNull(),
  phoneE164: text("phone_e164").notNull(),
  licenceNumber: text("licence_number"),
  licenceExpiresOn: date("licence_expires_on"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  /** When the driver consented to Cartrack location/mileage tracking. */
  trackingConsentAt: timestamp("tracking_consent_at", { withTimezone: true }),
  trackingConsentVersion: text("tracking_consent_version"),
  notes: text("notes"),
  /** Soft delete — drivers are never hard-deleted, they have payment/rent history. */
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
