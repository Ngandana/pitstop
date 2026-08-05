/**
 * Applies pending migrations from drizzle/migrations.
 *
 * Deliberately NOT `drizzle-kit migrate` / `drizzle-kit push`: both hung
 * indefinitely against this project's Supabase session pooler (confirmed
 * the pooler and the schema itself were fine — a raw postgres.js query
 * and a raw `sql.unsafe(migrationFile)` both worked instantly; something
 * about drizzle-kit's own CLI connection handling was the problem).
 * `drizzle-orm`'s built-in migrator uses the exact same postgres.js
 * connection as the rest of the app, which we've proven works, so we use
 * that directly instead.
 *
 * Run with: npm run db:migrate
 */

import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const { db } = await import("../src/db");

  await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  console.log("Migrations applied.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
