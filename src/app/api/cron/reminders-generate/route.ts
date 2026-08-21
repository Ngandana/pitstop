import { NextResponse } from "next/server";
import { generateReminders } from "@/lib/reminders/generate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily Vercel Cron, 07:30 SAST (see vercel.json — 05:30 UTC), ahead of
 * the weekly rent summary's Wednesday-08:00 slot and the reminders-sweep
 * cron that follows it. Only writes to the reminders outbox (§5) —
 * src/app/api/cron/reminders-sweep is what actually sends.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await generateReminders();
  console.log("Reminder generation complete:", summary);

  return NextResponse.json({ summary });
}
