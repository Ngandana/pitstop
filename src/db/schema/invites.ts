import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Invite-only sign-up allowlist. An email must be here (or be OWNER_EMAIL,
 * the platform admin) before a magic link is sent, and again before a
 * first login provisions an organisation. Emails are stored lower-cased.
 */
export const invites = pgTable("invites", {
  email: text("email").primaryKey(),
  note: text("note"),
  invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
});
