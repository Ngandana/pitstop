import { NextResponse } from "next/server";
import { createCartrackProviderFromEnv } from "@/lib/telematics/cartrack";
import { syncAllBikes } from "@/lib/telematics/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Nightly Vercel Cron at 02:00 SAST (see vercel.json — 00:00 UTC).
 * Vercel signs scheduled invocations with `Authorization: Bearer
 * $CRON_SECRET` automatically once CRON_SECRET is set as an env var;
 * anything else (a stray request, a curious visitor) gets rejected.
 *
 * §5: "the app must work fully without Cartrack" — a missing/broken
 * Cartrack config fails this *endpoint*, not the app. Every other
 * screen still works.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let provider;
  try {
    provider = createCartrackProviderFromEnv();
  } catch (error) {
    console.error("Cartrack not configured:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }

  const results = await syncAllBikes(provider);
  const summary = {
    synced: results.filter((r) => r.status === "synced").length,
    rejected: results.filter((r) => r.status === "rejected").length,
    failed: results.filter((r) => r.status === "failed").length,
  };
  console.log("Mileage sync complete:", summary);

  return NextResponse.json({ summary, results });
}
