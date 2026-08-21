import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { assignments, bikes, payments, rentCharges, services } from "@/db/schema";
import { calculateArrears, calculateBalance, type ChargeLike } from "@/lib/money/balance";

export type DriverMoneySummary = {
  balanceCents: number;
  daysInArrears: number;
  charges: (ChargeLike & { id: string; assignmentId: string; waiveReason: string | null })[];
  payments: {
    id: string;
    amountCents: number;
    method: string;
    reference: string | null;
    paidAt: Date;
    voidedAt: Date | null;
    voidReason: string | null;
    proofStorageKey: string | null;
  }[];
};

export async function getDriverMoneySummary(driverId: string): Promise<DriverMoneySummary> {
  const [chargeRows, paymentRows] = await Promise.all([
    db
      .select({
        id: rentCharges.id,
        assignmentId: rentCharges.assignmentId,
        periodStart: rentCharges.periodStart,
        periodEnd: rentCharges.periodEnd,
        amountCents: rentCharges.amountCents,
        waivedCents: rentCharges.waivedCents,
        waiveReason: rentCharges.waiveReason,
      })
      .from(rentCharges)
      .where(eq(rentCharges.driverId, driverId))
      .orderBy(desc(rentCharges.periodStart)),
    db
      .select({
        id: payments.id,
        amountCents: payments.amountCents,
        method: payments.method,
        reference: payments.reference,
        paidAt: payments.paidAt,
        voidedAt: payments.voidedAt,
        voidReason: payments.voidReason,
        proofStorageKey: payments.proofStorageKey,
      })
      .from(payments)
      .where(eq(payments.driverId, driverId))
      .orderBy(desc(payments.paidAt)),
  ]);

  const nonVoided = paymentRows.filter((p) => p.voidedAt === null);
  const balanceCents = calculateBalance(chargeRows, nonVoided);
  const totalPaidCents = nonVoided.reduce((sum, p) => sum + p.amountCents, 0);
  const asOf = new Date().toISOString().slice(0, 10);
  const { daysInArrears } = calculateArrears({ charges: chargeRows, totalPaidCents, asOf });

  return { balanceCents, daysInArrears, charges: chargeRows, payments: paymentRows };
}

export type DriverBalanceInfo = { balanceCents: number; daysInArrears: number };

/** Bulk version for /drivers list — same small-fleet per-driver loop pattern used elsewhere. */
export async function getDriverBalances(orgId: string): Promise<Map<string, DriverBalanceInfo>> {
  const driverRows = await db.query.drivers.findMany({
    where: (d, { and, eq, isNull }) => and(eq(d.orgId, orgId), isNull(d.deletedAt)),
  });

  const result = new Map<string, DriverBalanceInfo>();
  for (const driver of driverRows) {
    const { balanceCents, daysInArrears } = await getDriverMoneySummary(driver.id);
    result.set(driver.id, { balanceCents, daysInArrears });
  }
  return result;
}

export type LedgerRow = {
  bikeId: string;
  registration: string;
  chargedCents: number;
  collectedCents: number;
  maintenanceCents: number;
  netCents: number;
};

/**
 * §7's /ledger screen: rent charged vs collected vs maintenance spend,
 * net per bike, for one calendar month. rent_charges/payments/services
 * don't carry bike_id directly (charges/payments key off assignment_id),
 * so this joins through assignments — fetched and aggregated in JS
 * rather than via SQL date_trunc, consistent with this codebase's
 * small-fleet-sized-data approach elsewhere.
 */
export async function getLedgerForMonth(orgId: string, monthStart: string, monthEnd: string): Promise<LedgerRow[]> {
  const [chargeRows, paymentRows, serviceRows, bikeRows] = await Promise.all([
    db
      .select({ bikeId: assignments.bikeId, amountCents: rentCharges.amountCents, waivedCents: rentCharges.waivedCents, periodStart: rentCharges.periodStart })
      .from(rentCharges)
      .innerJoin(assignments, eq(assignments.id, rentCharges.assignmentId))
      .where(eq(rentCharges.orgId, orgId)),
    db
      .select({ bikeId: assignments.bikeId, amountCents: payments.amountCents, paidAt: payments.paidAt, voidedAt: payments.voidedAt })
      .from(payments)
      .innerJoin(assignments, eq(assignments.id, payments.assignmentId))
      .where(eq(payments.orgId, orgId)),
    db
      .select({ bikeId: services.bikeId, costCents: services.costCents, performedAt: services.performedAt })
      .from(services)
      .where(eq(services.orgId, orgId)),
    db.query.bikes.findMany({ where: eq(bikes.orgId, orgId) }),
  ]);

  const byBike = new Map<string, LedgerRow>();
  for (const bike of bikeRows) {
    byBike.set(bike.id, {
      bikeId: bike.id,
      registration: bike.registration,
      chargedCents: 0,
      collectedCents: 0,
      maintenanceCents: 0,
      netCents: 0,
    });
  }

  for (const c of chargeRows) {
    if (c.periodStart < monthStart || c.periodStart > monthEnd) continue;
    const row = byBike.get(c.bikeId);
    if (row) row.chargedCents += c.amountCents - c.waivedCents;
  }

  for (const p of paymentRows) {
    if (p.voidedAt !== null) continue;
    const paidAtDate = p.paidAt.toISOString().slice(0, 10);
    if (paidAtDate < monthStart || paidAtDate > monthEnd) continue;
    const row = byBike.get(p.bikeId);
    if (row) row.collectedCents += p.amountCents;
  }

  for (const s of serviceRows) {
    if (s.performedAt < monthStart || s.performedAt > monthEnd) continue;
    if (s.costCents === null) continue;
    const row = byBike.get(s.bikeId);
    if (row) row.maintenanceCents += s.costCents;
  }

  for (const row of byBike.values()) {
    row.netCents = row.collectedCents - row.maintenanceCents;
  }

  return [...byBike.values()].sort((a, b) => a.registration.localeCompare(b.registration));
}
