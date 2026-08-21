import { bigint, boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * There is exactly one row in this table in v1 (one owner, one fleet).
 * Every core table still carries org_id so multi-tenancy is a later
 * *feature*, not a later *migration*. Do not expose org switching in
 * the UI — see §4 of the brief.
 */
export const organisations = pgTable("organisations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("Africa/Johannesburg"),
  /** §7 Settings: "rent policy defaults" — pre-fills /assignments/new, never required. */
  defaultWeeklyRentCents: bigint("default_weekly_rent_cents", { mode: "number" }),
  defaultDepositCents: bigint("default_deposit_cents", { mode: "number" }),
  /** §7 Settings: "my notification preferences". Null email = fall back
   *  to the owner's own login (users.email) — see src/lib/reminders. */
  notificationEmail: text("notification_email"),
  emailRemindersEnabled: boolean("email_reminders_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
