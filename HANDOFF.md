# Pitstop — session handoff

Written 2026-08-22, for continuing this project on a different machine. Paste
this file's content (or just point Claude Code at it) at the start of a new
session, after cloning the repo and running `npm install` + copying over a
real `.env.local` (see `.env.example` / README "Local setup").

## What this project is

**Pitstop**: a fleet operations tool for a small South African
delivery-scooter rental business (single owner, magic-link auth, no
multi-tenant UI). The full spec is checked into the repo verbatim at
**`pitstop-claude-code-prompt.md`** — that file is the source of truth for
every scope/formula/schema decision. Read it before making any non-trivial
change. Section references below (§3, §5, etc.) point into that file.

## Status: all 7 milestones done, mid-deploy

The brief's build order (§8) has exactly 7 milestones; all 7 are built and
committed:

1. Foundation — schema, Supabase Auth, app shell, Today screen
2. Fleet & drivers — CRUD, assignments, 6 handover photos, status history
3. Mileage — Cartrack client, nightly cron, manual entry, validation
4. Servicing — due-calc, Today surfacing, log-a-service
5. Money — rent charges, payments, balances, arrears, ledger
6. Reminders — outbox table, generation+sweep crons, Resend templates, `wa.me` buttons
7. Polish pass — §9 checklist fixes, plus building out the previously-stubbed
   `/settings` screen for real (see "Notable decisions" below)

**Where we actually are right now:** the user asked to deploy to Vercel next
(not part of the original 7 milestones — the brief's build order stops at
"polish pass"). I gave a deploy walkthrough (push → import in Vercel → env
vars, with `DATABASE_URL` swapped to the **Transaction pooler** and
`NEXT_PUBLIC_SITE_URL` to the prod URL → Supabase redirect URL → crons
auto-pickup via `vercel.json`). The user has since pushed `main` to
`origin/main` (confirmed in sync as of this writing). **Whether the actual
Vercel import/env-var setup/first deploy happened is unknown to this
session** — that's the natural next thing to check in with the user about.

## Standing rules (from the brief, §10 — still in force)

- **Ask before**: adding a new npm dependency, changing the schema after
  Milestone 1, or building anything in the brief's non-goals list (§2) — no
  mechanic portal, no payment gateway, no driver login, no WhatsApp Business
  API integration, etc.
- **Do not scaffold and stub** — every milestone/feature should be genuinely
  working, not a placeholder. (This is exactly what caught `/settings` still
  being a "coming soon" stub during the polish pass — see below.)
- **Commit in logical units**, clear messages, no mega-commits. This project
  commits straight to `main` (no feature-branch workflow) — that's the
  established convention here, not an oversight.
- The user consistently wants **live verification against the real Supabase
  project**, not just type-check/lint/test passing. See "Testing
  methodology" below — reuse this pattern rather than inventing a new one.
- When you find a real bug, **disclose it plainly**, including when the bug
  turns out to be in your own test script rather than the app (this has
  happened a few times — always verify against DB state/screenshots before
  concluding either way).

## Core data-model rules (§3–§4 of the brief) — do not violate these

- **Money**: integer cents in `bigint` columns, mapped to JS `number` (not
  native `bigint`) — a deliberate, documented choice, safe at this scale.
- **Distances**: integer km.
- **Dates**: stored UTC, rendered `Africa/Johannesburg` at the boundary
  (`src/lib/format.ts`, `src/lib/action-items.ts`). Never do naive
  local-time day-boundary math — SAST is UTC+2 with no DST, but a naive
  calculation still gives wrong answers near midnight. There's a test
  guarding this.
- **Append-only tables**: `odometer_readings`, `payments`, `services`,
  `rent_charges`. Never `UPDATE` these in place — corrections are new rows,
  or the two sanctioned "soft void with a reason" exceptions:
  `rent_charges.waived_cents`/`waive_reason` and
  `payments.voided_at`/`void_reason`. Nothing else on those tables is ever
  touched after insert.
- **Never store a derived value** — service-due km/progress, balances, days
  in arrears are always computed at read time
  (`src/lib/servicing/due-calc.ts`, `src/lib/money/balance.ts`), never
  persisted columns.

## Business logic quick reference (§5)

- **Service-due progress**: `MAX((current_km - last_service_km) /
  interval_km, (today - last_service_at) / max_interval_days)`. Thresholds:
  `>= 0.8` warning, `>= 1.0` due, `>= 1.2` overdue.
- **Rent proration**: first period for an assignment is clipped to its start
  date, prorated at 1/7 weekly rent per day; every period after that is a
  clean 7-day block anchored to `rent_due_weekday`.
- **Balance**: `SUM(amount - waived) - SUM(non-voided payments)`. "Days in
  arrears" isn't in the brief's formula — it's my own reasonable derived
  definition: apply total payments FIFO against charges oldest-first, find
  the first charge not fully covered.
- **Reminders cadence** (§5's table, all implemented in
  `src/lib/reminders/generate.ts` + `src/lib/telematics/sync.ts`): weekly
  rent summary (Wed only), service warning (once on crossing), service due
  (on crossing then every 3 days), service overdue (daily), licence expiring
  (exactly 60/30/7 days out), bike hasn't moved (once per 7-day occurrence),
  Cartrack sync failed twice (email-only, on 2nd consecutive failure).
  Outbox pattern: generation cron only *writes* rows, a separate sweep cron
  *sends* — never send directly from the scheduler.

## Notable technical gotchas hit this session (don't rediscover these)

1. **`reminders_dedupe` is a partial unique index** (`WHERE dedupe_key IS
   NOT NULL`, since the column is nullable). Any `onConflictDoNothing({
   target: reminders.dedupeKey })` needs a matching `where:
   sql\`${reminders.dedupeKey} IS NOT NULL\`` or Postgres throws 42P10 ("no
   unique or exclusion constraint matching ON CONFLICT"). This was silently
   broken since Milestone 3 (the Cartrack-sync-failure alert) until caught
   and fixed in Milestone 6 — both call sites now have the fix.
2. **Zod + unchecked HTML checkboxes**: an unchecked `<input type=
   checkbox>` sends *no key at all* in `FormData`. `z.coerce.boolean()` on a
   genuinely-absent key throws ("expected nonoptional, received undefined")
   rather than coercing to `false`. Fix: translate presence explicitly —
   `formData.has("fieldName")` — into a real boolean *before* calling
   `.safeParse()`, and use a plain `z.boolean()` in the schema. See
   `src/app/(app)/settings/actions.ts` `updateNotificationPreferences`.
3. **Next 16 typed-routes + dev server**: after restarting `next dev`,
   `tsc --noEmit` can show phantom errors on dynamic routes
   (`[id]/edit` etc.) that haven't been visited yet in dev mode, because
   `.next/types/routes.d.ts` is generated incrementally. Run a full `next
   build` to get a trustworthy type-check baseline — don't chase these as
   real bugs.
4. **Playwright `fullPage` screenshots + `position: fixed` elements**: the
   mobile bottom nav can appear to overlap in-flow content in a stitched
   full-page screenshot. This is a screenshot-compositing artifact, not a
   real bug — the app already reserves `pb-20` on `<main>` specifically to
   clear the fixed nav (`src/components/app-shell/app-shell.tsx`). Verify
   against the actual CSS before treating this as a finding.
5. **`server-only` package breaks direct `tsx` execution**: any file
   importing `"server-only"` throws immediately when run outside Next's own
   bundler (e.g. `npx tsx somefile.ts` for a quick debug script) — it's not
   a real bug, just means you can't `tsx`-run server modules directly for
   debugging. Restart the dev server and hit the route over HTTP instead to
   see real stack traces (`npm run dev`, then read the background task's
   output file).
6. **`drizzle-kit push`/`migrate` CLI hangs** against this Supabase
   project's pooler for unrelated reasons — always use `npm run db:migrate`
   (`scripts/migrate.ts`, drizzle-orm's own migrator), never the CLI
   commands directly. `db:generate` (schema→SQL diff, no live connection) is
   fine via the CLI.

## Testing methodology (reuse this)

Live verification against the **real** Supabase project, not a test DB:

1. Auth: Supabase Admin API's `auth.admin.generateLink({ type: "magiclink",
   email: OWNER_EMAIL })`, redeem it once in a throwaway Playwright context
   to get a real session, decode the JWT, hand-construct the
   `sb-<project-ref>-auth-token` cookie, inject it into a fresh context.
   (Full working script pattern used repeatedly — ask to see one of the
   `verify-milestone*.mjs` scripts from history if needed, or reconstruct
   from this description.)
2. Create/backdate test data either through the real UI (Playwright clicks)
   or directly via `postgres.js` against `DATABASE_URL` when you need
   precise control (e.g. backdating an assignment's `started_at`,
   engineering a service schedule to sit exactly at a threshold).
3. Hit cron routes directly: `curl -H "Authorization: Bearer $CRON_SECRET"
   http://localhost:3000/api/cron/<name>`.
4. **Always clean up test data afterward** — delete rows you created,
   restore any real settings/values you changed to their original state.
   Never touch real user data.
5. **Known real data quirk**: there's a driver named "test" (phone
   `+27781153465`, notes "Just testing") assigned to bike `JDW844X`, created
   2026-08-21 — this is the actual user's own live activity in the app, NOT
   test data left by an agent. Do not delete it or treat it as debris to
   clean up.
6. Dev server: check `netstat -ano | grep ":3000"` before starting a new
   one; if you need to see real error stack traces, kill any existing
   instance and start `npm run dev` with `run_in_background: true` so you
   can read its output file — a route's 500 response body is often empty,
   the real stack trace only shows up in the server log.

## Key files map

- `pitstop-claude-code-prompt.md` — the locked brief, source of truth
- `src/db/schema/*.ts` — Drizzle schema (one file per domain area)
- `src/lib/servicing/due-calc.ts` — service-due formula
- `src/lib/money/{balance,rent-period}.ts` — balance/arrears, rent proration
- `src/lib/reminders/{generate,sweep}.ts` — outbox generation + sweep
- `src/lib/email/{resend,templates}.ts` — email sending + per-template HTML
- `src/lib/telematics/{sync,cartrack,validate-odometer}.ts` — mileage sync
- `src/lib/whatsapp.ts` — `wa.me` link builder
- `src/app/(app)/settings/` — the Settings screen (built in the polish pass)
- `src/app/api/cron/*/route.ts` — the 4 cron routes (mileage-sync,
  rent-charges, reminders-generate, reminders-sweep), all following the same
  `Bearer $CRON_SECRET` + `force-dynamic` + JSON-response pattern
- `vercel.json` — all 4 cron schedules
- `scripts/migrate.ts` — the migration runner (not the drizzle-kit CLI)
- `README.md` — local setup, migrations, seeding, Vercel deploy steps
  (kept up to date through this session)

## Immediate next step

Confirm with the user whether the Vercel import/first deploy actually
happened, and if not, walk through it: push (if not already done) → import
`Ngandana/pitstop` at vercel.com/new → env vars (note the
`DATABASE_URL`/`NEXT_PUBLIC_SITE_URL` swaps) → Supabase redirect URL → the
crons pick up automatically, nothing else to configure. Offer to curl the
deployed URL and cron endpoints once it's live to confirm it actually works
end to end, not just that the build succeeded.
