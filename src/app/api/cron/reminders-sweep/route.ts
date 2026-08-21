import { NextResponse } from "next/server";
import { sweepReminders } from "@/lib/reminders/sweep";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily Vercel Cron, 08:00 SAST (see vercel.json — 06:00 UTC), right
 * after reminders-generate. Sends every still-pending `email` reminder
 * via Resend; `in_app` reminders never reach this route — they're
 * marked sent at generation time (the Today screen is their delivery
 * surface, per §5's cadence table read literally: "Email + in-app").
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await sweepReminders();
  console.log("Reminder sweep complete:", summary);

  return NextResponse.json({ summary });
}
