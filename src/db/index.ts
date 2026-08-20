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
//
// Cached on `globalThis` in development: `next dev`'s hot-reload re-runs
// this module on nearly every file save (almost everything imports db),
// and without this a fresh postgres.js client — a fresh connection pool —
// gets created each time, with the old one never closed. Over a long dev
// session that steadily eats Supabase's session-pooler connection cap
// (15 on the free tier) until every query starts failing with
// "max clients reached in session mode". Production gets a fresh module
// instance per cold start anyway, so this only changes dev behaviour.
const globalForDb = globalThis as unknown as { pgClient?: postgres.Sql };

const client = globalForDb.pgClient ?? postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
