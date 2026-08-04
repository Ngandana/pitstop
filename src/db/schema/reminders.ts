import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organisations } from "./organisations";
import { reminderChannelEnum, reminderTemplateEnum } from "./enums";

/**
 * The reminders outbox (§5). The scheduler only ever writes rows here;
 * a separate sweep cron reads and sends. dedupe_key + the partial unique
 * index below means a retried sweep can never double-send.
 */
export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organisations.id),
    template: reminderTemplateEnum("template").notNull(),
    channel: reminderChannelEnum("channel").notNull(),
    recipient: text("recipient").notNull(),
    payload: jsonb("payload").notNull(),
    dedupeKey: text("dedupe_key"),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("reminders_dedupe")
      .on(table.dedupeKey)
      .where(sql`${table.dedupeKey} IS NOT NULL`),
  ],
);
