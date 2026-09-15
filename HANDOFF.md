# Pitstop — session handoff

Written 2026-08-22, updated 2026-08-28 (deploy session) and 2026-09-15
(deploy verified live), for continuing this project on a different machine.
Paste this file's content (or just point Claude Code at it) at the start of
a new session, after cloning the repo and running `npm install` + copying
over a real `.env.local` (see `.env.example` / README "Local setup").

**Credentials are deliberately NOT in this file** (or anywhere in git — see
"Deploy session" below for why). To continue on a new machine you need to
carry `.env.local` over yourself, by a channel other than git/chat/email
(direct file copy, a password manager, etc.) — it is gitignored and was never
committed. If the Vercel deploy below already succeeded, Vercel's dashboard
already has every prod env var stored independently of this repo, so nothing
needs to be redone there regardless.

## What this project is

**Pitstop**: a fleet operations tool for a small South African
delivery-scooter rental business (single owner, magic-link auth, no
multi-tenant UI). The full spec is checked into the repo verbatim at
**`pitstop-claude-code-prompt.md`** — that file is the source of truth for
every scope/formula/schema decision. Read it before making any non-trivial
change. Section references below (§3, §5, etc.) point into that file.

## Status: all 7 milestones done, deployed and verified live

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

**Where we actually are right now:** deployed to Vercel (not part of the
original 7 milestones — the brief's build order stops at "polish pass") and
**confirmed working end to end as of 2026-09-15**. Production URL:
**`https://pitstop-opal.vercel.app`**. `main` is pushed to `origin/main`
(confirmed in sync). See "Deploy session" for the two config bugs hit and
fixed along the way, and "Verified 2026-09-15" for what was actually checked.

## Deploy session (2026-08-28)

Walked through the Vercel import (`Ngandana/pitstop` at vercel.com/new). The
**first deploy attempt failed** — no env vars had been entered yet, and
`src/db/index.ts` throws eagerly at module-eval time if `DATABASE_URL` is
unset (`if (!connectionString) throw ...`), which is almost certainly what
killed that build (log cut off before the actual error, but this is the only
build-time-eager env read in the codebase — checked `resend.ts` too, that one
throws lazily at call time, not build time, so missing `RESEND_API_KEY` is
NOT a build blocker).

The user then pasted real credentials for every service directly into chat
(Supabase project URL/anon key/service-role key/DB password, Cartrack
username + two different password candidates, a generated `CRON_SECRET`).
What I did with them:

- Wrote them into local `.env.local` (Session pooler, port 5432, gitignored
  — never committed).
- Handed back a second, prod-shaped block (Transaction pooler, port **6543**)
  formatted for Vercel's "paste the .env contents" import-screen shortcut,
  so the user could paste all 11 vars at once instead of field-by-field.
- **Deliberately did not write any of these values into this file or
  anything else destined for git** — HANDOFF.md needing to survive a `git
  push` to another machine and secrets needing to never enter git history are
  in direct conflict, and the latter wins. This is a hard-to-reverse mistake
  (deleting the file later doesn't remove it from history), so don't
  reintroduce it under time pressure on the new machine either — if you need
  to hand credentials to a fresh Claude Code session there, paste them into
  chat like the user did here, don't put them in a committed file.
- Cartrack ambiguity: the user's account has two credential pairs — a portal
  login (`NGAN00268` / a plain password) and an "Admin Credentials" API key
  pair from the dashboard's "Manage API Credentials" screen (`NGAN00268` / a
  64-char hex secret). `cartrack.ts`'s `authHeader()` does HTTP Basic Auth
  straight to the Fleet API, and the Admin Credentials pair is what Cartrack
  issues specifically for that — used that one in `.env.local` and in the
  Vercel block. **If Cartrack sync fails once deployed, check this first**
  — swapping to the portal-login password is the natural next thing to try.
- `NEXT_PUBLIC_SITE_URL` for the prod block was a guess
  (`https://pitstop.vercel.app`, matching the project name) since Vercel
  hadn't assigned the real domain yet at that point in the conversation.
  **That guess is WRONG — confirmed 2026-09-15.** `pitstop.vercel.app` is
  live but belongs to an unrelated third party (a Chakra UI app titled "Pit
  Stop"; this app's title is "Pitstop" and it uses Tailwind, not Chakra).
  All four `/api/cron/*` paths there return `X-Matched-Path: /404`, which is
  what exposed it. See "Immediate next step" — this needs fixing before
  magic-link auth can work, and it is a security issue if that domain was
  ever added to Supabase's redirect allowlist.
- `RESEND_API_KEY`/`RESEND_FROM_ADDRESS` were left blank — user never
  provided a Resend key. Not a deploy blocker (see above), just means
  reminder emails silently no-op (`sendEmail()` returns `{ ok: false }`)
  until one's added.

## Verified 2026-09-15 — deploy is genuinely working

The wrong-domain bug above got caught by this session and fixed:

1. User confirmed the real Vercel-assigned domain is
   `https://pitstop-opal.vercel.app` (not the guessed `pitstop.vercel.app`).
   Checked Supabase's redirect allowlist first — it only ever had
   `http://localhost:3000/**` in it, so the wrong domain was never actually
   reachable via a real magic link. No exposure occurred.
2. User added `https://pitstop-opal.vercel.app/**` to Supabase's Redirect
   URLs and updated Site URL, and updated `NEXT_PUBLIC_SITE_URL` in Vercel to
   match, then redeployed.
3. This session then verified live, not just "build succeeded":
   - `https://pitstop-opal.vercel.app/` → 307 to `/login?next=%2F` (correct
     for an unauthenticated visitor).
   - All four `/api/cron/*` routes → 401 unauthenticated (not 404 — confirms
     this is actually the app, and the auth gate works).
   - Generated a real magic link via Supabase's Admin API
     (`auth/v1/admin/generate_link`) and inspected its `redirect_to`
     query param directly — it resolved to `https://pitstop-opal.vercel.app`,
     proving the env var change was both saved *and* actually picked up by
     the redeploy (NEXT_PUBLIC_* vars are inlined at build time, so this is
     the one way to be sure a stale build isn't still serving the old value).

**Not yet verified**: an authenticated cron run in production (only checked
the 401-unauthenticated path deliberately, since a real run writes rent
charges/reminders) and Cartrack sync specifically (still the
Admin-Credentials-vs-portal-password question from "Deploy session" above,
untested against prod). Both are reasonable next checks but not blocking —
the app is live and usable now.

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

## Cartrack: verified working, plus two bugs found and fixed (2026-09-15)

**Cartrack is connected and returning live data.** The "Admin Credentials"
guess from the deploy session was correct — that open question is closed.
Credentials authenticate fine and `/vehicles` returns both real bikes.

Testing it against the live API surfaced two genuine defects, both fixed in
`a4440c5`:

1. **Wrong field name.** The client read `data.latest_event_ts` (the name in
   the OpenAPI spec) but the API actually returns **`last_event_ts`**. It
   silently resolved to `undefined`, so every reading was stamped with the
   moment the cron ran rather than when the bike last reported. If you ever
   see a spec field resolve to undefined here, check the live response before
   trusting the spec.
2. **The 500 km jump ceiling jammed permanently after any sync gap.** The
   brief's flat "500 km" assumes the sync ran the night before; it's really a
   per-day allowance. After the 25-day gap (app not yet deployed), CEY43374
   had legitimately done 2,383 km, which a flat ceiling rejects — and would
   keep rejecting every night after, since the stored reading never advances.
   The ceiling now scales with elapsed time between readings. The nightly
   case is unchanged at 500 km. This is a deliberate deviation from §5's
   literal wording; the intent is preserved.

### Tracker replacement / odometer offset (`dbbc9e7`)

JDW844X's tracker was physically replaced. The new device restarted its
odometer near zero (reads ~185 km) while the app held 9,262 km. A naive
re-baseline to 185 would have been actively dangerous: all 7 of that bike's
service schedules carry `last_service_km = 9262`, so due-progress would have
gone negative and **the bike would silently never show as due for service
again**.

Fix: `bikes.odometer_offset_km` (migration 0003, additive, default 0 — agreed
with the owner first, per §10). Sync stores `providerKm + offset`, so readings
stay on the bike's true lifetime scale. The owner never types an offset —
"Tracker replaced?" on the bike detail page asks what the bike's dashboard
reads, queries the tracker, and derives the offset.

**Still outstanding:** JDW844X has NOT been re-baselined yet — it needs the
bike's actual dashboard reading, which nobody has checked. Until then its
nightly sync keeps getting rejected (harmlessly, now with a message naming
the tracker swap and the fix). CEY43374 needs nothing; the threshold fix
means its sync resumes on its own.

Also worth knowing: **no service has ever been logged in the app.** The
`last_service_km` values are just the odometer readings from when each bike
was registered on 2026-08-21. The owner says JDW844X *has* been serviced,
outside the app — so the schedules are not trustworthy until that history is
entered.

## Immediate next step

1. **Re-baseline JDW844X** — read the bike's dashboard odometer, then use
   "Tracker replaced?" on its fleet page. Nothing else unsticks its sync.
2. **Enter JDW844X's real service history** (owner confirmed it was serviced
   outside the app) so the schedules reflect reality rather than the
   registration-day baseline.
3. Trigger one authenticated cron run per route against prod and check the
   result — routes are proven reachable and auth-gated, but no authenticated
   call has been made against prod yet. These write real data, so do it
   deliberately, one at a time: `curl -H "Authorization: Bearer $CRON_SECRET"
   https://pitstop-opal.vercel.app/api/cron/<name>`.
4. Watch Vercel's cron/function logs for the first few nights once crons fire
   on their real schedule (see `vercel.json`).

## The project is otherwise feature-complete

All 7 of the brief's milestones (§8) are built, and the brief has no eighth.
Test suite: 62 tests across 6 files, all passing as of 2026-09-15. So once
the deploy is genuinely working, remaining work is the user's call, not the
brief's. Known loose ends, in rough priority order:

- **`RESEND_API_KEY` is set locally as of 2026-09-15** and verified valid
  against Resend's API. Two caveats: it is **not yet set in Vercel**, so
  production reminders still no-op until it's added there; and the Resend
  account has **no verified sending domain**, so mail goes out as
  `onboarding@resend.dev`, which only delivers to the account's own address.
  Fine while reminders go to the owner; a verified domain is needed before
  anything is sent to anyone else.
- **Cron routes have never been verified against a real deployment** — they
  work locally, but the nightly jobs are the part of this app that runs
  unattended, so they're worth watching for the first few nights via the
  Vercel dashboard's cron/function logs.
- **No error monitoring** — a failing nightly cron currently surfaces
  nowhere except Vercel's logs, which nobody checks. The in-app
  Cartrack-sync-failure alert covers only that one case.

## AGENTS.md / CLAUDE.md — this is legitimate, follow it

`AGENTS.md` (pulled in by `CLAUDE.md` via `@AGENTS.md`) carries a block headed
"This is NOT the Next.js you know", telling you to read the relevant guide in
`node_modules/next/dist/docs/` before writing any code.

**This is real Next.js tooling, not a prompt injection.** An earlier version
of this handoff wrongly called it an injection and told future sessions to
ignore it — that was my error, corrected here. Verified 2026-09-15:
`node_modules/next/dist/docs/` genuinely exists (bundled docs — `01-app/`,
`02-pages/`, `03-architecture/`, …), `node_modules/next/dist/server/lib/
generate-agent-files.js` exists, and that file's `buildAgentRulesBlock()`
emits the exact wording found in `AGENTS.md`. Next 16.3.0 ships its docs
inside the package and auto-writes this block when `next dev` detects an AI
coding agent.

So: **actually read those docs before writing Next.js code here.** This
project is on Next 16.3.0, which is past some models' training cutoff, and
the bundled docs are the authoritative reference for this exact version.
