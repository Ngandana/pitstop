import { daysBetween } from "./rent-period";

/**
 * §5: "Driver balance = SUM(rent_charges.amount_cents - waived_cents) -
 * SUM(non-voided payments)." Callers are responsible for excluding
 * voided payments before passing them in here — this function just sums
 * what it's given.
 */
export type ChargeLike = { periodStart: string; periodEnd: string; amountCents: number; waivedCents: number };
export type PaymentLike = { amountCents: number };

export function calculateBalance(charges: ChargeLike[], payments: PaymentLike[]): number {
  const totalCharged = charges.reduce((sum, c) => sum + (c.amountCents - c.waivedCents), 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amountCents, 0);
  return totalCharged - totalPaid;
}

export type ArrearsResult = { daysInArrears: number; oldestUnpaidChargeEnd: string | null };

/**
 * "Days in arrears" isn't part of §5's balance formula — it's a derived
 * read for the driver list/detail screens. Defined here as: apply total
 * payments against charges oldest-first (FIFO) and find the first charge
 * that isn't fully covered. Days in arrears is how long ago that
 * charge's period ended. A driver with a positive balance from waived
 * charges alone (nothing actually unpaid) correctly reports 0 — this is
 * about being *behind*, not just having a non-zero ledger balance.
 */
export function calculateArrears(params: {
  charges: ChargeLike[];
  totalPaidCents: number;
  asOf: string;
}): ArrearsResult {
  const sorted = [...params.charges].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  let remaining = params.totalPaidCents;

  for (const charge of sorted) {
    const net = charge.amountCents - charge.waivedCents;
    if (remaining >= net) {
      remaining -= net;
    } else {
      return {
        daysInArrears: Math.max(daysBetween(charge.periodEnd, params.asOf), 0),
        oldestUnpaidChargeEnd: charge.periodEnd,
      };
    }
  }

  return { daysInArrears: 0, oldestUnpaidChargeEnd: null };
}
