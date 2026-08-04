import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// `generate` only diffs the schema files against the local migration
// snapshots — it doesn't need a live connection, so we fall back to a
// placeholder for that command. `push`, `migrate`, and `studio` do need a
// real DATABASE_URL in .env.local (see .env.example).
const connectionString = process.env.DATABASE_URL ?? "postgresql://placeholder";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
  strict: true,
  verbose: true,
});
