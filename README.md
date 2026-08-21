# Pitstop

Fleet operations for a small scooter rental business — bike/driver registration,
mileage tracking, kilometre-based service due dates, rent, and reminders.
See `pitstop-claude-code-prompt.md` for the full v1 brief.

Single-owner tool, magic-link auth, no multi-tenant UI. Milestones 1–6 are
done (foundation, fleet/driver CRUD + handover photos, Cartrack sync,
servicing, rent/payments/ledger, reminders outbox) — Milestone 7 (polish
pass) is in progress.

## Stack

Next.js 16 (App Router, TS strict) &middot; Tailwind v4 &middot; shadcn/ui &middot;
Supabase (Postgres + Auth) &middot; Drizzle ORM &middot; Zod &middot; Vitest

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. [supabase.com/dashboard](https://supabase.com/dashboard) → New project.
2. **Project Settings → API** → copy the Project URL, `anon` key, and
   `service_role` key.
3. **Project Settings → Database** → copy the **Session pooler**
   connection string (not the direct one — see the note under step 4).
4. **Authentication → Sign In / Providers** → make sure **Email** (magic
   link / OTP, not password) is enabled.
5. **Authentication → URL Configuration** → set Site URL to
   `http://localhost:3000` and add `http://localhost:3000/**` to Redirect
   URLs.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the Supabase values from step 2, plus:

- `OWNER_EMAIL` — the only address allowed to request a magic link.
- `NEXT_PUBLIC_SITE_URL` — `http://localhost:3000` for local dev.
- `CRON_SECRET` — any random string (`openssl rand -hex 32`). Vercel signs
  scheduled cron requests with it in production; locally it's just what
  you pass in the `Authorization: Bearer ...` header when testing the
  cron route by hand.
- `CARTRACK_USERNAME` / `CARTRACK_PASSWORD` — optional. Without them the
  mileage-sync cron returns a clean error instead of the app breaking
  (§5: "the app must work fully without Cartrack"). `CARTRACK_BASE_URL`
  defaults to South Africa's endpoint in `.env.example`.
- `RESEND_API_KEY` — optional. Without it the reminders-sweep cron marks
  each pending email as a failed attempt (recorded, not crashed) instead
  of the app breaking, same philosophy as Cartrack above. `RESEND_FROM_ADDRESS`
  defaults to `onboarding@resend.dev`, which works with zero setup but only
  delivers to the Resend account's own verified address — fine for
  developing the pipeline before a real sending domain is verified.

### 4. Run migrations

```bash
npm run db:migrate
```

**Note on Supabase's direct connection:** `db.<ref>.supabase.co` (port 5432)
resolves to an **IPv6-only** address. If your network doesn't have outbound
IPv6, use the **Session pooler** connection string instead (Project
Settings → Database → Connection string) — it's IPv4-compatible. Also:
`drizzle-kit push`/`drizzle-kit migrate` (the CLI commands) hung
indefinitely against this project's pooler for reasons unrelated to the
schema — a raw `postgres.js` query over the same connection worked
instantly. `npm run db:migrate` runs `scripts/migrate.ts`, which uses
`drizzle-orm`'s built-in migrator (same connection code as the app) instead
of the CLI, and that's reliable. `db:generate` (schema → SQL diff, no live
connection needed) still uses the `drizzle-kit` CLI — that one's fine.

### 5. Seed sample data

```bash
npm run db:seed
```

Creates the org, 2 bikes, 2 drivers, 2 open assignments, the 7 default
service types, and 60 days of plausible odometer history. Safe to re-run —
it's a no-op if the org already has bikes.

### 6. Create the Storage bucket

```bash
npm run storage:setup
```

Creates the private `handover-photos` bucket (assignment condition
photos). Safe to re-run — no-ops if it already exists.

### 7. Sign in

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), request a magic link
with `OWNER_EMAIL`, and click the link in your inbox. The first sign-in
creates your `users` row and (if `db:seed` hasn't already) the organisation.

### 8. Test the crons locally (optional)

Vercel doesn't run your `vercel.json` cron schedules locally — trigger
them by hand instead:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/mileage-sync
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/rent-charges
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders-generate
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders-sweep
```

Without `CARTRACK_USERNAME`/`CARTRACK_PASSWORD` set, mileage-sync returns
a clean 500 explaining Cartrack isn't configured. Without `RESEND_API_KEY`
set, reminders-sweep returns 200 but marks every pending email as a failed
attempt. Both are expected, not bugs — always run reminders-generate
before reminders-sweep, since sweep only sends what generate has already
queued.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build / run |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:watch` | Vitest (run once / watch mode) |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply checked-in migrations (see the note above — not the `drizzle-kit` CLI) |
| `npm run db:studio` | Drizzle Studio (browse the DB) |
| `npm run db:seed` | Seed sample data (see above) |
| `npm run storage:setup` | Create the handover-photos Storage bucket |

## Deploying to Vercel

1. Import the repo in Vercel.
2. Add the same environment variables as `.env.local`, with two changes:
   - `DATABASE_URL` → use Supabase's **Transaction pooler** connection
     string (port 6543) instead of the direct one — serverless functions
     need pooled connections. `src/db/index.ts` already passes
     `prepare: false`, which pooled connections require.
   - `NEXT_PUBLIC_SITE_URL` → your production URL.
3. Add the production URL to Supabase's **Authentication → URL
   Configuration → Redirect URLs**.
4. All four crons (`vercel.json`) pick up automatically on deploy — Vercel
   signs their requests with `CRON_SECRET` for you, nothing else to
   configure: mileage-sync (02:00 SAST), rent-charges (06:00 SAST),
   reminders-generate (07:30 SAST), reminders-sweep (08:00 SAST).

## Notes for whoever maintains this next

- **Money** is integer cents in a `bigint` column, mapped to a JS `number`
  (not native `bigint`) — see the comment in `src/db/schema/bikes.ts`. Safe
  at this scale; reconsider if amounts could ever approach
  `Number.MAX_SAFE_INTEGER`.
- **Append-only tables** (`odometer_readings`, `payments`, `services`,
  `rent_charges`) are never updated in place — corrections are new rows,
  or a soft void with a reason. Don't add `UPDATE`s against them.
- **Dates**: store UTC, render `Africa/Johannesburg` — see
  `src/lib/format.ts` and `src/lib/action-items.ts`. The timezone
  conversion isn't optional decoration; a naive local-time day
  calculation gives wrong answers near midnight SAST (caught by a test).
- **Telematics** goes through the `TelematicsProvider` interface
  (`src/lib/telematics/types.ts`) — `CartrackProvider` and
  `ManualProvider` both implement it, so swapping trackers later means
  writing a new provider, not touching the sync job. The nightly sync
  only ever calls the provider for bikes that have a
  `cartrack_vehicle_id`; it never invokes `ManualProvider` (which always
  returns "not supported") since a bike with no tracker isn't a sync
  failure worth alerting on.
- **Reminders are an outbox, not a send-immediately call.** The
  reminders-generate cron only ever writes rows to `reminders`; the
  separate reminders-sweep cron reads pending `email` rows and sends
  them. Never call `sendEmail` directly from generation logic — every
  new trigger should write to the outbox with a `dedupe_key` (and
  remember `reminders_dedupe` is a *partial* unique index, so
  `onConflictDoNothing` needs a matching `where` clause or Postgres
  rejects it — see `src/lib/reminders/generate.ts`). Driver-facing
  reminders don't send themselves either: `wa.me` "Send to driver"
  buttons are the only delivery mechanism to a driver, by design (§5) —
  don't wire up a messaging API.
- **`/api/*` routes are excluded from the auth proxy** (`src/proxy.ts`)
  — they authenticate themselves (the cron routes check a Bearer token)
  and must return JSON on failure, never an HTML redirect to `/login`.
  Keep any new route under `/api/` out of the cookie-session gate for
  the same reason.
- **Next.js 16**: `middleware.ts` is renamed `proxy.ts`/`proxy()` (see
  `src/proxy.ts`); `params`/`searchParams`/`cookies()`/`headers()` are
  async-only, no sync fallback. If an AI agent's training data predates
  this, it will confidently write Next 15-era code that doesn't compile —
  check `node_modules/next/dist/docs/` against the installed version
  before trusting instinct here.
