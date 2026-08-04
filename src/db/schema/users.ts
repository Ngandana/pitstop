import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organisations } from "./organisations";

/**
 * The single owner account. `id` is the Supabase Auth user id
 * (auth.users.id) — deliberately *not* a foreign key across schemas,
 * since Drizzle migrations don't manage the `auth` schema. Supabase
 * guarantees the id is stable and never reused.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  email: text("email").notNull(),
  fullName: text("full_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
