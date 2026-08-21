"use client";

import { Users, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DriverListRow } from "@/lib/queries/drivers";
import { formatCents, formatDate } from "@/lib/format";
import { daysUntil } from "@/lib/action-items";
import { cn } from "@/lib/utils";

function LicenceExpiry({ date }: { date: string | null }) {
  if (!date) return <span className="text-text-muted">—</span>;
  const days = daysUntil(new Date(`${date}T00:00:00Z`), new Date());
  const soon = days <= 60;
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${soon ? "text-warning" : "text-text-secondary"}`}
    >
      {soon ? <TriangleAlert className="size-3.5" aria-hidden="true" /> : null}
      {formatDate(date)}
    </span>
  );
}

function Balance({ balanceCents, daysInArrears }: { balanceCents: number; daysInArrears: number }) {
  const owing = balanceCents > 0;
  return (
    <div>
      <p className={cn("font-medium tabular-nums", owing ? "text-danger" : "text-text-secondary")}>
        {formatCents(balanceCents)}
      </p>
      {daysInArrears > 0 ? (
        <p className="text-xs text-danger">{daysInArrears} day{daysInArrears === 1 ? "" : "s"} behind</p>
      ) : null}
    </div>
  );
}

export function DriverList({ drivers }: { drivers: DriverListRow[] }) {
  const router = useRouter();

  if (drivers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <Users className="size-8 text-text-muted" aria-hidden="true" />
        <p className="max-w-sm text-sm text-text-secondary">
          No drivers registered yet. Add your first driver to start assigning bikes.
        </p>
        <Link
          href="/drivers/new"
          className="mt-1 inline-flex h-11 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors duration-150 hover:bg-accent/90"
        >
          Add your first driver
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
        {drivers.map((d) => (
          <li key={d.id}>
            <Link
              href={`/drivers/${d.id}`}
              className="block rounded-xl border border-border bg-surface-raised p-4 shadow-sm transition-colors duration-150 hover:border-accent/40"
            >
              <p className="text-base font-bold tracking-tight text-foreground">{d.fullName}</p>
              <p className="text-xs text-text-secondary">{d.phoneE164}</p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-text-secondary">{d.bikeRegistration ?? "No bike"}</span>
                <LicenceExpiry date={d.licenceExpiresOn} />
              </div>
              <div className="mt-2 border-t border-border pt-2">
                <Balance balanceCents={d.balanceCents} daysInArrears={d.daysInArrears} />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface-raised md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-text-secondary">
              <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">
                Driver
              </th>
              <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">
                Phone
              </th>
              <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">
                Current bike
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium whitespace-nowrap">
                Balance
              </th>
              <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">
                Licence expiry
              </th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => (
              <tr
                key={d.id}
                onClick={() => router.push(`/drivers/${d.id}`)}
                className="cursor-pointer border-b border-border transition-colors duration-150 last:border-0 hover:bg-surface-sunken"
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link
                    href={`/drivers/${d.id}`}
                    className="font-semibold text-foreground hover:text-accent"
                  >
                    {d.fullName}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-text-secondary">{d.phoneE164}</td>
                <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                  {d.bikeRegistration ?? "No bike"}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Balance balanceCents={d.balanceCents} daysInArrears={d.daysInArrears} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <LicenceExpiry date={d.licenceExpiresOn} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
