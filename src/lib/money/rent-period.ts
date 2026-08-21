/**
 * §5: "A Vercel Cron job generates one rent_charge per open assignment
 * per week, on the assignment's rent_due_weekday. Pro-rate the first
 * week if the assignment started mid-period (1/7 of weekly rent per
 * day)."
 *
 * Model: the first-ever period for an assignment is clipped to its
 * start date — short, prorated, running until the day before the next
 * occurrence of rent_due_weekday (or a full clean week if the
 * assignment happened to start exactly on the due weekday). Every
 * period after that is a clean 7-day block anchored to that weekday.
 *
 * Dates are plain 'YYYY-MM-DD' strings throughout — rent periods are a
 * calendar concept (whole days in Africa/Johannesburg), not instants.
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function weekdayOf(dateString: string): number {
  // A date-only string has no timezone ambiguity to resolve — SAST has
  // no DST, so "which calendar day is this" and "what weekday is that"
  // never depend on time-of-day here.
  return new Date(`${dateString}T00:00:00Z`).getUTCDay();
}

function addDays(dateString: string, days: number): string {
  const d = new Date(`${dateString}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / MS_PER_DAY);
}

export type RentPeriod = { periodStart: string; periodEnd: string; amountCents: number };

export function computeNextRentPeriod(params: {
  startedAt: string;
  rentDueWeekday: number;
  weeklyRentCents: number;
  /** null if no charge has ever been generated for this assignment. */
  lastChargePeriodEnd: string | null;
}): RentPeriod {
  const { startedAt, rentDueWeekday, weeklyRentCents, lastChargePeriodEnd } = params;

  if (lastChargePeriodEnd === null) {
    const startWeekday = weekdayOf(startedAt);
    if (startWeekday === rentDueWeekday) {
      return { periodStart: startedAt, periodEnd: addDays(startedAt, 6), amountCents: weeklyRentCents };
    }

    const daysUntilDue = (rentDueWeekday - startWeekday + 7) % 7; // 1..6, since startWeekday !== rentDueWeekday
    const periodEnd = addDays(startedAt, daysUntilDue - 1);
    const amountCents = Math.round((weeklyRentCents / 7) * daysUntilDue);
    return { periodStart: startedAt, periodEnd, amountCents };
  }

  const periodStart = addDays(lastChargePeriodEnd, 1);
  return { periodStart, periodEnd: addDays(periodStart, 6), amountCents: weeklyRentCents };
}
