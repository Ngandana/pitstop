import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { rentCharges } from "@/db/schema";
import { computeNextRentPeriod } from "./rent-period";

const MAX_PERIODS_PER_RUN = 60; // catch-up ceiling if the cron missed a long stretch — plenty for a daily job

export type RentChargeRunResult = {
  assignmentId: string;
  bikeId: string;
  driverId: string;
  chargesCreated: { periodStart: string; periodEnd: string; amountCents: number }[];
};

/**
 * §5: generates one rent_charge per open assignment per week, on its
 * rent_due_weekday, with the first period prorated if the assignment
 * started mid-week. Idempotent and safe to run more than once a day —
 * it only ever creates a charge for a period that's actually begun and
 * doesn't already have one, and loops forward to catch up if it's been
 * a while since the last run.
 */
export async function generateRentCharges(orgId: string, asOf: string): Promise<RentChargeRunResult[]> {
  const openAssignments = await db.query.assignments.findMany({
    where: (a, { and, eq, isNull }) => and(eq(a.orgId, orgId), isNull(a.endedAt)),
  });

  const results: RentChargeRunResult[] = [];

  for (const assignment of openAssignments) {
    const created: RentChargeRunResult["chargesCreated"] = [];
    const startedAtDate = assignment.startedAt.toISOString().slice(0, 10);

    for (let i = 0; i < MAX_PERIODS_PER_RUN; i++) {
      const [lastCharge] = await db
        .select({ periodEnd: rentCharges.periodEnd })
        .from(rentCharges)
        .where(eq(rentCharges.assignmentId, assignment.id))
        .orderBy(desc(rentCharges.periodEnd))
        .limit(1);

      const next = computeNextRentPeriod({
        startedAt: startedAtDate,
        rentDueWeekday: assignment.rentDueWeekday,
        weeklyRentCents: assignment.weeklyRentCents,
        lastChargePeriodEnd: lastCharge?.periodEnd ?? null,
      });

      if (next.periodStart > asOf) break; // this period hasn't started yet — stop

      await db.insert(rentCharges).values({
        orgId,
        assignmentId: assignment.id,
        driverId: assignment.driverId,
        periodStart: next.periodStart,
        periodEnd: next.periodEnd,
        amountCents: next.amountCents,
      });
      created.push(next);
    }

    if (created.length > 0) {
      results.push({
        assignmentId: assignment.id,
        bikeId: assignment.bikeId,
        driverId: assignment.driverId,
        chargesCreated: created,
      });
    }
  }

  return results;
}
