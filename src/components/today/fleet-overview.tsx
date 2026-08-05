import { Bike } from "lucide-react";
import Link from "next/link";
import type { TodayBike } from "@/lib/queries/today";
import { BikeStatusBadge } from "@/components/bike-status-badge";
import { formatKmValue, formatDate } from "@/lib/format";

export function FleetOverview({ bikes }: { bikes: TodayBike[] }) {
  if (bikes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <Bike className="size-8 text-text-muted" aria-hidden="true" />
        <p className="max-w-sm text-sm text-text-secondary">
          No bikes registered yet. Add your first bike to start tracking mileage, servicing, and
          rent.
        </p>
        <Link
          href="/fleet"
          className="mt-1 inline-flex h-11 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors duration-150 hover:bg-accent/90"
        >
          Go to Fleet
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Mobile / tablet: cards */}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
        {bikes.map((bike) => (
          <li
            key={bike.id}
            className="rounded-xl border border-border bg-surface-raised p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-bold tracking-tight text-foreground">
                  {bike.registration}
                </p>
                <p className="text-xs text-text-secondary">
                  {bike.make} {bike.model}
                </p>
              </div>
              <BikeStatusBadge status={bike.status} />
            </div>

            <p className="mt-4 text-stat text-foreground">
              {bike.latestOdometerKm !== null ? formatKmValue(bike.latestOdometerKm) : "—"}
              <span className="ml-1 text-sm font-normal text-text-secondary">km</span>
            </p>

            <div className="mt-3 flex items-center justify-between text-xs text-text-secondary">
              <span>{bike.driverName ?? "Unassigned"}</span>
              <span>
                {bike.latestOdometerAt ? formatDate(bike.latestOdometerAt) : "No readings"}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: real table, not stacked cards (§6 density rule) */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface-raised md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-text-secondary">
              <th scope="col" className="px-4 py-3 font-medium">
                Registration
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Driver
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Odometer
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Last reading
              </th>
            </tr>
          </thead>
          <tbody>
            {bikes.map((bike) => (
              <tr key={bike.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <p className="font-semibold text-foreground">{bike.registration}</p>
                  <p className="text-xs text-text-secondary">
                    {bike.make} {bike.model}
                  </p>
                </td>
                <td className="px-4 py-3 text-text-secondary">{bike.driverName ?? "Unassigned"}</td>
                <td className="px-4 py-3 text-right font-medium text-foreground tabular-nums">
                  {bike.latestOdometerKm !== null ? `${formatKmValue(bike.latestOdometerKm)} km` : "—"}
                </td>
                <td className="px-4 py-3">
                  <BikeStatusBadge status={bike.status} />
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {bike.latestOdometerAt ? formatDate(bike.latestOdometerAt) : "No readings"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
