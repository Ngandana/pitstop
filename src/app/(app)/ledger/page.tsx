import Link from "next/link";
import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { getCurrentOrg } from "@/lib/queries/org";
import { getLedgerForMonth } from "@/lib/queries/money";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function monthBounds(monthParam: string | undefined): { monthKey: string; start: string; end: string; label: string } {
  const monthKey =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? monthParam
      : formatInTimeZone(new Date(), "Africa/Johannesburg", "yyyy-MM");

  const [year, month] = monthKey.split("-").map(Number);
  const start = `${monthKey}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${monthKey}-${String(lastDay).padStart(2, "0")}`;
  const label = new Date(`${start}T00:00:00Z`).toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return { monthKey, start, end, label };
}

function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function LedgerPage({ searchParams }: PageProps<"/ledger">) {
  const { month } = await searchParams;
  const { monthKey, start, end, label } = monthBounds(typeof month === "string" ? month : undefined);

  const org = await getCurrentOrg();
  const rows = await getLedgerForMonth(org.id, start, end);

  const totals = rows.reduce(
    (acc, r) => ({
      chargedCents: acc.chargedCents + r.chargedCents,
      collectedCents: acc.collectedCents + r.collectedCents,
      maintenanceCents: acc.maintenanceCents + r.maintenanceCents,
      netCents: acc.netCents + r.netCents,
    }),
    { chargedCents: 0, collectedCents: 0, maintenanceCents: 0, netCents: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-hero text-foreground">Ledger</h1>
      </header>

      <div className="flex items-center justify-center gap-3">
        <Link
          href={`/ledger?month=${shiftMonth(monthKey, -1)}`}
          aria-label="Previous month"
          className="flex size-11 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors duration-150 hover:bg-surface-sunken hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Link>
        <p className="min-w-40 text-center text-sm font-medium text-foreground">{label}</p>
        <Link
          href={`/ledger?month=${shiftMonth(monthKey, 1)}`}
          aria-label="Next month"
          className="flex size-11 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors duration-150 hover:bg-surface-sunken hover:text-foreground"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <Wallet className="size-8 text-text-muted" aria-hidden="true" />
          <p className="max-w-sm text-sm text-text-secondary">No bikes registered yet.</p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
            {rows.map((r) => (
              <li key={r.bikeId} className="rounded-xl border border-border bg-surface-raised p-4 shadow-sm">
                <p className="text-base font-bold tracking-tight text-foreground">{r.registration}</p>
                <dl className="mt-3 flex flex-col gap-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-text-secondary">Charged</dt>
                    <dd className="font-medium tabular-nums text-foreground">{formatCents(r.chargedCents)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-text-secondary">Collected</dt>
                    <dd className="font-medium tabular-nums text-foreground">{formatCents(r.collectedCents)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-text-secondary">Maintenance</dt>
                    <dd className="font-medium tabular-nums text-foreground">{formatCents(r.maintenanceCents)}</dd>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-1.5">
                    <dt className="font-medium text-foreground">Net</dt>
                    <dd
                      className={cn(
                        "font-semibold tabular-nums",
                        r.netCents < 0 ? "text-danger" : "text-success",
                      )}
                    >
                      {formatCents(r.netCents)}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          {/* Desktop: real table */}
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface-raised md:block">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-text-secondary">
                  <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">
                    Bike
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium whitespace-nowrap">
                    Charged
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium whitespace-nowrap">
                    Collected
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium whitespace-nowrap">
                    Maintenance
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium whitespace-nowrap">
                    Net
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.bikeId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-semibold whitespace-nowrap text-foreground">
                      {r.registration}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-foreground">
                      {formatCents(r.chargedCents)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-foreground">
                      {formatCents(r.collectedCents)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-foreground">
                      {formatCents(r.maintenanceCents)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums",
                        r.netCents < 0 ? "text-danger" : "text-success",
                      )}
                    >
                      {formatCents(r.netCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-semibold">
                  <td className="px-4 py-3 whitespace-nowrap text-foreground">Total</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-foreground">
                    {formatCents(totals.chargedCents)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-foreground">
                    {formatCents(totals.collectedCents)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-foreground">
                    {formatCents(totals.maintenanceCents)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right whitespace-nowrap tabular-nums",
                      totals.netCents < 0 ? "text-danger" : "text-success",
                    )}
                  >
                    {formatCents(totals.netCents)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
