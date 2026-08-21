import { NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/db";
import { generateRentCharges } from "@/lib/money/generate-rent-charges";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily Vercel Cron, 06:00 SAST (see vercel.json — 04:00 UTC). Runs daily
 * rather than weekly because each assignment can have a different
 * rent_due_weekday — the generator itself decides whether a given
 * assignment is actually due today.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await db.query.organisations.findFirst();
  if (!org) {
    return NextResponse.json({ summary: { assignments: 0, chargesCreated: 0 }, results: [] });
  }

  const asOf = formatInTimeZone(new Date(), "Africa/Johannesburg", "yyyy-MM-dd");
  const results = await generateRentCharges(org.id, asOf);

  const summary = {
    assignments: results.length,
    chargesCreated: results.reduce((sum, r) => sum + r.chargesCreated.length, 0),
  };
  console.log("Rent charge generation complete:", summary);

  return NextResponse.json({ summary, results });
}
