# Pitstop

Fleet operations for a small scooter rental business — bike/driver registration,
mileage tracking, kilometre-based service due dates, rent, and reminders.
See `pitstop-claude-code-prompt.md` for the full v1 brief.

Single-owner tool, magic-link auth, no multi-tenant UI. Currently on
**Milestone 1: Foundation**.

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
3. **Project Settings → Database** → copy the direct connection string
   (port 5432) for local dev.
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

Cartrack and Resend variables aren't needed until Milestones 3 and 6.

### 4. Run migrations

```bash
npm run db:push
```

(`db:push` applies the schema directly — fine for a single-owner v1 with
no other environments to keep in sync. `db:migrate` replays the checked-in
SQL files in `drizzle/migrations` instead, if you'd rather do it that way.)

### 5. Seed sample data

```bash
npm run db:seed
```

Creates the org, 2 bikes, 2 drivers, 2 open assignments, the 7 default
service types, and 60 days of plausible odometer history. Safe to re-run —
it's a no-op if the org already has bikes.

### 6. Sign in

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), request a magic link
with `OWNER_EMAIL`, and click the link in your inbox. The first sign-in
creates your `users` row and (if `db:seed` hasn't already) the organisation.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build / run |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:watch` | Vitest (run once / watch mode) |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:push` | Push the schema straight to the database |
| `npm run db:migrate` | Apply checked-in migrations |
| `npm run db:studio` | Drizzle Studio (browse the DB) |
| `npm run db:seed` | Seed sample data (see above) |

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
4. Vercel Cron jobs (nightly Cartrack sync, weekly rent charges, reminder
   sweep) land in their respective milestones — none are wired up yet.

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
- **Next.js 16**: `middleware.ts` is renamed `proxy.ts`/`proxy()` (see
  `src/proxy.ts`); `params`/`searchParams`/`cookies()`/`headers()` are
  async-only, no sync fallback. If an AI agent's training data predates
  this, it will confidently write Next 15-era code that doesn't compile —
  check `node_modules/next/dist/docs/` against the installed version
  before trusting instinct here.
