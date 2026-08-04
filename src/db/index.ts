import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill in your Supabase connection string.",
  );
}

// `prepare: false` is required when connecting through Supabase's
// transaction-mode connection pooler (port 6543, pgbouncer) — prepared
// statements aren't safe across pooled connections. Harmless on a direct
// connection too, so we leave it on everywhere for one code path.
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
