# Claude Code — Build Prompt: Pitstop v1

> Paste everything below this line into Claude Code in an empty directory.

---

You are building **Pitstop**, a fleet operations tool for a small South African delivery-scooter rental business. Read this whole brief before writing any code, then confirm your plan with me before starting Milestone 1.

## 1. Context — who this is for

I own delivery scooters and rent them to gig drivers (Mr D, Uber Eats, Checkers Sixty60). I currently have **2 bikes** and I track everything in my head, WhatsApp threads, and a notebook. That does not scale and I lose money to it.

I am a full-stack developer. I will maintain this codebase myself. Write code you would hand to a competent developer, not code that impresses in a demo.

This is **v1 of a deliberately small slice**. There is a much larger product design behind it — a mechanic quote/approval loop, photo proof of repairs, payment gateways, multi-tenant SaaS. **None of that is in scope.** The point of v1 is to prove the tool is genuinely useful for my own two bikes before I build the rest. Do not build ahead of this spec.

## 2. What v1 does

Exactly five things:

1. **Register bikes and drivers**, and record which driver has which bike since when.
2. **Know each bike's mileage**, pulled nightly from the Cartrack API, with manual entry as fallback.
3. **Tell me when a service is due**, calculated from kilometres — not a fixed calendar.
4. **Track rent** — what each driver owes, what they've paid, who is behind.
5. **Remind me** — a weekly rent summary, and service warnings — by email and in-app, with one-tap WhatsApp forwarding to the driver.

### Explicit non-goals (do not build these)
- Mechanic portal, quotes, approvals, repair photo proof
- Payment gateway / card processing / subscriptions
- Driver login or driver portal
- WhatsApp Business API or any chatbot
- Websockets, live updates, real-time anything
- Multi-tenancy UI, org switching, team roles
- Analytics dashboards beyond the metrics named in §7
- Native mobile apps
- Route optimisation

If you think one of these is needed, **stop and ask me** rather than building it.

## 3. Stack — locked, do not substitute

| Layer | Choice |
|---|---|
| Framework | Next.js 15+, App Router, TypeScript strict mode |
| Styling | Tailwind CSS v4 with a semantic design-token layer (see §6) |
| UI primitives | shadcn/ui, customised — do not ship default shadcn styling |
| Icons | `lucide-react` only. **No emoji as icons, ever.** |
| Database | Supabase Postgres |
| ORM / queries | Drizzle ORM with migrations checked into the repo |
| File storage | Supabase Storage |
| Auth | Supabase Auth, email magic link. Single owner account. |
| Email | Resend |
| Cron | Vercel Cron |
| Charts | Recharts, only where a chart genuinely beats a number |
| Hosting | Vercel |
| Validation | Zod on every API boundary and form |
| Dates | `date-fns` + `date-fns-tz`. Store UTC, render `Africa/Johannesburg`. |

Money is **integer cents in a `bigint`**. Never a float. Format as `R 1 234,56` (SA convention — space as thousands separator, comma as decimal).

Distances are **integer kilometres**.

## 4. Data model

Build this schema in Drizzle. Every core table carries `org_id` even though there is exactly one org in v1 — this is so multi-tenancy is a later feature, not a later migration. Do not expose org switching in the UI.

**Tables:**

- `organisations` — id, name, timezone (default `Africa/Johannesburg`)
- `users` — owner account, linked to Supabase Auth user
- `drivers` — org_id, full_name, phone_e164, licence_number, licence_expires_on, started_at, ended_at, tracking_consent_at, tracking_consent_version, notes, deleted_at
- `bikes` — org_id, registration (unique per org), make, model, engine_cc, year, colour, vin, purchase_date, purchase_price_cents, **cartrack_vehicle_id**, status, deleted_at
- `bike_status_history` — bike_id, from_status, to_status, reason, changed_at *(this is how downtime is measured — never make me log it manually)*
- `assignments` — org_id, bike_id, driver_id, started_at, ended_at, end_reason, weekly_rent_cents, rent_due_weekday (default 3 = Wednesday), deposit_cents, start_odometer_km, end_odometer_km, notes
- `handover_photos` — assignment_id, phase (`handover` | `return`), angle, storage_key, taken_at
- `odometer_readings` — org_id, bike_id, reading_km, source (`cartrack` | `manual` | `service` | `handover`), recorded_at, override_flag, raw_payload (jsonb)
- `service_types` — org_id, code, label, default_interval_km, default_max_interval_days
- `service_schedules` — org_id, bike_id, service_type_id, interval_km, max_interval_days, last_service_km, last_service_at, active
- `services` — org_id, bike_id, service_type_id, odometer_km, performed_at, cost_cents, workshop_name, notes *(a completed-service record only — no quote or approval workflow)*
- `rent_charges` — org_id, assignment_id, driver_id, period_start, period_end, amount_cents, waived_cents, waive_reason
- `payments` — org_id, driver_id, assignment_id, amount_cents, method (`cash`|`eft`|`payshap`|`capitec_pay`|`instant_eft`|`other`), reference, paid_at, period_start, period_end, proof_storage_key, voided_at, void_reason
- `reminders` — org_id, template, channel, recipient, payload (jsonb), dedupe_key, due_at, sent_at, failed_at, attempts, last_error

**Enums:** `bike_status` = `unassigned | active | in_service | off_road | stolen | written_off | sold`

**Constraints that matter:**
```sql
CREATE UNIQUE INDEX one_open_assignment_per_bike
  ON assignments (bike_id) WHERE ended_at IS NULL;
CREATE UNIQUE INDEX one_open_assignment_per_driver
  ON assignments (driver_id) WHERE ended_at IS NULL;
CREATE UNIQUE INDEX reminders_dedupe ON reminders (dedupe_key)
  WHERE dedupe_key IS NOT NULL;
```

**Append-only rule:** `odometer_readings`, `payments`, `services`, `rent_charges` are facts that happened. Never update in place. Corrections are new rows, or a soft void with a reason. The audit trail is the point of this product.

**Never store a derived value.** `km_to_next_service` is computed, never a column.

## 5. Core logic

### Service-due calculation
```
progress = MAX(
  (current_km - last_service_km) / interval_km,
  (today - last_service_at) / max_interval_days
)
```
- `progress >= 0.8` → **warning**
- `progress >= 1.0` → **due**
- `progress >= 1.2` → **overdue**, escalate daily

Seed `service_types` with these defaults (125cc scooter, severe/delivery duty):

| code | label | interval_km | max_interval_days |
|---|---|---|---|
| `oil` | Engine oil | 1500 | 45 |
| `gear_oil` | Gear / final drive oil | 6000 | 365 |
| `air_filter` | Air filter | 3000 | 180 |
| `brakes` | Brakes (inspect) | 1500 | 45 |
| `cvt_belt` | CVT belt & variator | 12000 | 730 |
| `spark_plug` | Spark plug | 6000 | 365 |
| `valves` | Valve clearance | 12000 | 730 |

When a new bike is created, auto-create a `service_schedule` row per active service type using these defaults, with `last_service_km` = the bike's current odometer and `last_service_at` = today. Let me edit any of them per bike.

### Cartrack sync
I have API credentials. Read them from env: `CARTRACK_USERNAME`, `CARTRACK_PASSWORD`, `CARTRACK_BASE_URL`.

- REST, **HTTP Basic auth**, HTTPS only. The OpenAPI spec is at `https://developer.cartrack.com/openapi/openapi.yaml` — fetch it and generate or hand-write a typed client against the real shapes. Do not guess response shapes.
- Relevant endpoint groups: **Vehicle**, **Vehicle Status**, **Trips**.
- Nightly Vercel Cron at **02:00 SAST** pulls the odometer for every bike with a `cartrack_vehicle_id` and inserts one `odometer_readings` row per bike.
- **Validation:** reject a reading that is lower than the previous one, or more than 500 km higher, unless `override_flag` is set. Log it and surface it to me — do not silently accept or silently drop.
- Store the full raw response in `raw_payload`.
- If the odometer field is not directly exposed, fall back to summing trip distances. If that also fails, log the failure and carry on — **the app must work fully without Cartrack.**
- Put this behind a `TelematicsProvider` interface with `cartrack` and `manual` implementations. I may switch trackers later.
- Alert me by email after two consecutive sync failures for the same bike.

### Rent charges
A Vercel Cron job generates one `rent_charge` per open assignment per week, on the assignment's `rent_due_weekday`.

- Pro-rate the first week if the assignment started mid-period (1/7 of weekly rent per day).
- Provide a manual **waive** action with a required reason (used when a bike is off road through no fault of the driver).
- Driver balance = `SUM(rent_charges.amount_cents - waived_cents) - SUM(non-voided payments)`.
- Do not auto-waive anything. I decide.

### Reminders
Write to the `reminders` outbox table; a separate cron sweeps and sends. Never send directly from the scheduler. Use `dedupe_key` so a retry cannot double-send.

| Trigger | When | Channel |
|---|---|---|
| Weekly rent summary — who owes what | Wednesday 08:00 | Email + in-app |
| Service warning (crossed 80%) | Once, on crossing | Email + in-app |
| Service due (100%) | On crossing, then every 3 days until logged | Email + in-app |
| Service overdue (120%) | Daily | Email + in-app |
| Licence expiring | 60 / 30 / 7 days before | Email + in-app |
| Bike hasn't moved in 48h during an active assignment | Once per occurrence | Email + in-app |
| Cartrack sync failed twice | On second failure | Email |

**Driver notification is manual by design in v1.** Every reminder that concerns a driver renders a **"Send to driver"** button that opens `https://wa.me/<phone>?text=<urlencoded message>` with a pre-written message. One tap, sends from my own WhatsApp, costs nothing. Do not integrate any messaging API.

## 6. UI/UX — this is not decoration, treat it as a requirement

The app is used on a phone, often outdoors in bright Cape Town sun, often in thirty seconds between other things. It must be **fast to read and impossible to misread**. Beauty here means clarity, not ornament.

### Build the design system before any screen
Start with a token layer — colour, spacing, radius, type scale, elevation, motion — as CSS custom properties consumed by Tailwind v4's `@theme`. Every component references semantic tokens (`--color-surface`, `--color-danger`, `--space-4`), never raw hex or arbitrary values. Then build **one screen to a finished standard** and show me before building the rest.

### Priority order — apply in this sequence when anything conflicts
1. **Accessibility** — 4.5:1 contrast minimum, visible focus rings on every interactive element, `aria-label` on icon-only buttons, semantic HTML, full keyboard operation
2. **Touch & interaction** — 44×44px minimum targets, loading feedback on every async action, no dead taps
3. **Performance** — WebP images, lazy loading below the fold, CLS < 0.1, no layout shift when data arrives
4. **Style selection** — match the product type: this is a serious operational tool, not a consumer app. SVG icons only, no emoji icons.
5. **Layout & responsive** — mobile-first; test at 375 / 768 / 1024 / 1440
6. **Typography & colour** — 16px base, line-height 1.5, semantic tokens throughout
7. **Animation** — 150–300ms, `transform` and `opacity` only, honour `prefers-reduced-motion`
8. **Forms & feedback** — visible labels always (never placeholder-as-label), inline validation on blur, clear error text
9. **Navigation** — bottom nav on mobile, max 5 items, predictable back behaviour
10. **Charts** — legends, tooltips, accessible colour, never colour alone to convey meaning

### Specific art direction — do not give me a generic dashboard template
- **Typography:** one confident sans for UI. Use **tabular figures** (`font-variant-numeric: tabular-nums`) on every number — kilometres, rand, dates, balances. In a ledger, misaligned digits are a bug.
- **Colour:** warm neutral base (stone/sand, not cold grey, and never pure `#000` or `#fff`). One decisive accent. Status colours must be colourblind-safe and **always paired with an icon and a text label** — never colour alone.
- **Hierarchy:** the number is the hero. On a bike card, `1 240 km to service` should be the largest, most confident element on screen. Labels are quiet; data is loud.
- **Density:** cards on mobile, real tables on desktop. Do not stack mobile cards on a 1440px screen — that wastes my monitor.
- **Dark mode:** required, not optional. I use this at night and outdoors.
- **Empty states:** every one gets a real sentence explaining what goes here and a button to add the first item. No shrugging illustrations.
- **Loading:** skeletons matching the final layout. No centred spinners.
- **Destructive actions:** confirm, and say exactly what will happen.
- **Offline tolerance:** forms queue in local storage and retry. Photo uploads compress client-side to under 300 KB before sending. I am often on patchy 3G.

### Avoid
Gradient-heavy hero sections, glassmorphism, purple-to-blue AI-startup palettes, decorative illustrations, animated counters, marketing-site energy. This is an instrument.

## 7. Screens

**`/` — Today.** The only screen I open most days. Anything needing action, ranked by urgency: services due or overdue, drivers in arrears, licences expiring, bikes that haven't moved. If nothing needs me, say so plainly and show the fleet at a glance. Never make me hunt.

**`/fleet`** — bike list: registration, current driver, odometer, km to next service (with progress indicator), status, rent state.

**`/fleet/[id]`** — one bike: full history, assignments, services, mileage chart, cost per 1 000 km, downtime days this month, and a "Log service" action.

**`/drivers`** — driver list with current bike, balance, days in arrears, licence expiry.

**`/drivers/[id]`** — assignment history, payment history, balance.

**`/ledger`** — rent charged vs collected, maintenance spend, **net per bike per month**. Filter by month. This is the screen that tells me whether the business is working.

**`/assignments/new`** — hand a bike to a driver: bike, driver, weekly rent, deposit, starting odometer, and **six condition photos** (front, rear, left, right, odometer, any existing damage). The photo step is the one non-negotiable extra in v1 — it is what settles a damage dispute later. Make it fast: camera capture, auto-compress, clear progress.

**Settings** — service interval defaults, rent policy defaults, my notification preferences.

## 8. Build order

Stop after each milestone, show me what works, and wait for my go-ahead.

1. **Foundation** — repo, Tailwind v4 token layer, Drizzle schema + migrations, Supabase Auth, app shell with mobile bottom nav and desktop sidebar. **Build the Today screen to a finished visual standard** and show me before continuing.
2. **Fleet & drivers** — CRUD for bikes and drivers, assignment creation with handover photos, status transitions writing to history.
3. **Mileage** — Cartrack client against the real OpenAPI spec, nightly cron, manual entry, validation rules, provider abstraction.
4. **Servicing** — schedules, due calculation, Today-screen surfacing, log-a-service flow.
5. **Money** — rent charge generation, payment recording, balances, arrears, ledger screen.
6. **Reminders** — outbox table, sweep cron, Resend templates, `wa.me` forward buttons.
7. **Polish pass** — run the checklist in §9 against every screen and fix everything that fails.

## 9. Definition of done

Do not tell me a milestone is complete until all of these pass:

- [ ] No emoji used as an icon anywhere
- [ ] `cursor-pointer` on every clickable element
- [ ] Hover states transition in 150–300ms
- [ ] Contrast ratio ≥ 4.5:1 everywhere, light and dark
- [ ] Focus states visible on every interactive element
- [ ] `prefers-reduced-motion` respected
- [ ] Renders correctly at 375, 768, 1024 and 1440px
- [ ] Every number uses tabular figures
- [ ] Every form field has a visible label
- [ ] Every async action shows loading state
- [ ] Every list has a designed empty state
- [ ] TypeScript strict passes with no `any`
- [ ] Zod validation on every API route and form
- [ ] `.env.example` documents every variable
- [ ] `README.md` covers local setup, migrations, seeding, and deploying to Vercel

## 10. How to work with me

- **Ask before** adding a dependency, changing the schema after Milestone 1, or building anything in the non-goals list.
- **Do not scaffold and stub.** Each milestone should be genuinely working before you move on.
- **Commit in logical units** with clear messages. No single mega-commit.
- Seed script should create my org, 2 bikes, 2 drivers, and 60 days of plausible odometer history so the charts and due calculations have something real to show.
- If something in this brief is ambiguous or you think it's wrong, say so before building it. I would rather argue for two minutes than refactor for two hours.

Start by reading this back to me as a short plan — what you'll build in Milestone 1, what you'll ask me for, and anything here you disagree with.
