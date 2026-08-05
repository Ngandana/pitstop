/**
 * Seeds a realistic starting point: one org, 2 bikes, 2 drivers, 2 open
 * assignments, and 60 days of plausible odometer history per bike — per
 * §10 of the brief, so the charts and due calculations have something
 * real to show.
 *
 * Idempotent: if the org already has bikes, it does nothing rather than
 * risk duplicating data.
 *
 * Run with: npm run db:seed
 *
 * Uses a dynamic import for the db module so dotenv can populate
 * process.env.DATABASE_URL *before* src/db/index.ts reads it — a plain
 * top-level import would be hoisted above the config() call and read an
 * empty env.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

/** Small seeded PRNG (mulberry32) — deterministic output run to run. */
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HISTORY_DAYS = 60;

async function main() {
  const { db } = await import("../src/db");
  const schema = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");

  const {
    organisations,
    bikes,
    drivers,
    assignments,
    odometerReadings,
    serviceTypes,
  } = schema;

  let [org] = await db.select().from(organisations).limit(1);
  if (!org) {
    [org] = await db.insert(organisations).values({ name: "My Fleet" }).returning();
    console.log(`Created organisation "${org.name}" (${org.id})`);
  } else {
    console.log(`Using existing organisation "${org.name}" (${org.id})`);
  }

  const existingBikes = await db
    .select({ id: bikes.id })
    .from(bikes)
    .where(eq(bikes.orgId, org.id))
    .limit(1);

  if (existingBikes.length > 0) {
    console.log("Bikes already exist for this org — skipping seed to avoid duplicates.");
    process.exit(0);
  }

  // --- service_types: the §5 defaults, seeded once per org -------------
  const SERVICE_TYPE_DEFAULTS = [
    { code: "oil", label: "Engine oil", defaultIntervalKm: 1500, defaultMaxIntervalDays: 45 },
    { code: "gear_oil", label: "Gear / final drive oil", defaultIntervalKm: 6000, defaultMaxIntervalDays: 365 },
    { code: "air_filter", label: "Air filter", defaultIntervalKm: 3000, defaultMaxIntervalDays: 180 },
    { code: "brakes", label: "Brakes (inspect)", defaultIntervalKm: 1500, defaultMaxIntervalDays: 45 },
    { code: "cvt_belt", label: "CVT belt & variator", defaultIntervalKm: 12000, defaultMaxIntervalDays: 730 },
    { code: "spark_plug", label: "Spark plug", defaultIntervalKm: 6000, defaultMaxIntervalDays: 365 },
    { code: "valves", label: "Valve clearance", defaultIntervalKm: 12000, defaultMaxIntervalDays: 730 },
  ];
  await db.insert(serviceTypes).values(
    SERVICE_TYPE_DEFAULTS.map((t) => ({ ...t, orgId: org.id })),
  );
  console.log(`Seeded ${SERVICE_TYPE_DEFAULTS.length} service types.`);

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  // --- bikes -------------------------------------------------------------
  const [bikeA, bikeB] = await db
    .insert(bikes)
    .values([
      {
        orgId: org.id,
        registration: "CA 123-456",
        make: "Bajaj",
        model: "Boxer 150",
        engineCc: 150,
        year: 2023,
        colour: "Red",
        purchaseDate: daysAgo(300).toISOString().slice(0, 10),
        purchasePriceCents: 28_500_00,
        status: "active",
      },
      {
        orgId: org.id,
        registration: "GP 456-789",
        make: "TVS",
        model: "Raider 125",
        engineCc: 125,
        year: 2024,
        colour: "Blue",
        purchaseDate: daysAgo(200).toISOString().slice(0, 10),
        purchasePriceCents: 24_000_00,
        status: "active",
      },
    ])
    .returning();
  console.log(`Seeded bikes: ${bikeA.registration}, ${bikeB.registration}`);

  // --- drivers -------------------------------------------------------------
  // Driver A's licence expires in 25 days on purpose — it's what makes
  // the Today screen's "needs your attention" section non-empty out of
  // the box.
  const [driverA, driverB] = await db
    .insert(drivers)
    .values([
      {
        orgId: org.id,
        fullName: "Sipho Ndlovu",
        phoneE164: "+27821234567",
        licenceNumber: "SN123456",
        licenceExpiresOn: daysAgo(-25).toISOString().slice(0, 10),
        startedAt: daysAgo(HISTORY_DAYS),
        trackingConsentAt: daysAgo(HISTORY_DAYS),
        trackingConsentVersion: "v1",
      },
      {
        orgId: org.id,
        fullName: "Thandiwe Mokoena",
        phoneE164: "+27731234568",
        licenceNumber: "TM654321",
        licenceExpiresOn: daysAgo(-400).toISOString().slice(0, 10),
        startedAt: daysAgo(HISTORY_DAYS),
        trackingConsentAt: daysAgo(HISTORY_DAYS),
        trackingConsentVersion: "v1",
      },
    ])
    .returning();
  console.log(`Seeded drivers: ${driverA.fullName}, ${driverB.fullName}`);

  // --- assignments ---------------------------------------------------------
  const START_KM: Record<string, number> = { [bikeA.id]: 6200, [bikeB.id]: 2100 };

  await db.insert(assignments).values([
    {
      orgId: org.id,
      bikeId: bikeA.id,
      driverId: driverA.id,
      startedAt: daysAgo(HISTORY_DAYS),
      weeklyRentCents: 850_00,
      depositCents: 1_500_00,
      startOdometerKm: START_KM[bikeA.id],
    },
    {
      orgId: org.id,
      bikeId: bikeB.id,
      driverId: driverB.id,
      startedAt: daysAgo(HISTORY_DAYS),
      weeklyRentCents: 800_00,
      depositCents: 1_500_00,
      startOdometerKm: START_KM[bikeB.id],
    },
  ]);
  console.log("Seeded 2 open assignments.");

  // --- 60 days of odometer history per bike ---------------------------
  // A delivery driver covers ~40-95km on a working day, with lighter
  // Sunday mileage. The first reading (day -60) is the handover reading;
  // the rest are nightly Cartrack-style syncs at ~02:05 SAST.
  const rng = mulberry32(20260804);
  const readingRows: (typeof odometerReadings.$inferInsert)[] = [];

  for (const bike of [bikeA, bikeB]) {
    let km = START_KM[bike.id];

    for (let dayOffset = HISTORY_DAYS; dayOffset >= 0; dayOffset--) {
      const at = daysAgo(dayOffset);
      at.setUTCHours(0, 5, 0, 0); // ~02:05 SAST

      if (dayOffset === HISTORY_DAYS) {
        readingRows.push({
          orgId: org.id,
          bikeId: bike.id,
          readingKm: km,
          source: "handover",
          recordedAt: at,
        });
        continue;
      }

      const isSunday = at.getUTCDay() === 0;
      const increment = isSunday
        ? Math.round(rng() * 15)
        : 40 + Math.round(rng() * 55);
      km += increment;

      readingRows.push({
        orgId: org.id,
        bikeId: bike.id,
        readingKm: km,
        source: "cartrack",
        recordedAt: at,
        rawPayload: { seeded: true, note: "Synthetic history from scripts/seed.ts" },
      });
    }
  }

  await db.insert(odometerReadings).values(readingRows);
  console.log(`Seeded ${readingRows.length} odometer readings (${HISTORY_DAYS} days x 2 bikes).`);

  console.log("\nDone. Sign in with your OWNER_EMAIL magic link to see it on the Today screen.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
