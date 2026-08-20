import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, UserPlus } from "lucide-react";
import { getBikeDetail } from "@/lib/queries/fleet";
import { BikeStatusBadge } from "@/components/bike-status-badge";
import { StatusChangeForm } from "@/components/fleet/status-change-form";
import { EndAssignmentForm } from "@/components/assignments/end-assignment-form";
import { formatCents, formatDate, formatDateTime, formatKm } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BikeDetailPage({ params }: PageProps<"/fleet/[id]">) {
  const { id } = await params;
  const detail = await getBikeDetail(id);
  if (!detail) notFound();

  const { bike, openAssignment, assignments, statusHistory, recentReadings, schedules, latestOdometerKm } =
    detail;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/fleet"
          className="inline-flex items-center gap-1 text-sm text-text-secondary transition-colors duration-150 hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Fleet
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-hero text-foreground">{bike.registration}</h1>
            <p className="text-sm text-text-secondary">
              {bike.make} {bike.model}
              {bike.year ? ` · ${bike.year}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BikeStatusBadge status={bike.status} />
            <Link
              href={`/fleet/${bike.id}/edit`}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-surface-sunken"
            >
              <Pencil className="size-4" aria-hidden="true" />
              Edit
            </Link>
          </div>
        </div>
      </div>

      <p className="text-stat text-foreground">
        {latestOdometerKm !== null ? formatKm(latestOdometerKm) : "No readings yet"}
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Current assignment */}
          <section className="rounded-xl border border-border bg-surface-raised p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Current assignment</h2>
            {openAssignment ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{openAssignment.driverName}</p>
                    <p className="text-sm text-text-secondary">
                      Since {formatDate(openAssignment.startedAt)} · started at{" "}
                      {formatKm(openAssignment.startOdometerKm)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground tabular-nums">
                      {formatCents(openAssignment.weeklyRentCents)}/wk
                    </p>
                    <p className="text-xs text-text-secondary tabular-nums">
                      Deposit {formatCents(openAssignment.depositCents)}
                    </p>
                  </div>
                </div>
                <EndAssignmentForm
                  assignmentId={openAssignment.id}
                  minOdometerKm={openAssignment.startOdometerKm}
                />
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-text-secondary">This bike isn&apos;t assigned to a driver.</p>
                <Link
                  href={`/assignments/new?bikeId=${bike.id}`}
                  className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors duration-150 hover:bg-accent/90"
                >
                  <UserPlus className="size-4" aria-hidden="true" />
                  Assign to a driver
                </Link>
              </div>
            )}
          </section>

          {/* Assignment history */}
          <section className="rounded-xl border border-border bg-surface-raised p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Assignment history</h2>
            {assignments.length === 0 ? (
              <p className="text-sm text-text-secondary">No assignments yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {assignments.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="font-medium text-foreground">{a.driverName}</p>
                      <p className="text-xs text-text-secondary">
                        {formatDate(a.startedAt)} &ndash;{" "}
                        {a.endedAt ? formatDate(a.endedAt) : "ongoing"}
                        {a.endReason ? ` (${a.endReason})` : ""}
                      </p>
                    </div>
                    <p className="text-sm text-text-secondary tabular-nums">
                      {formatCents(a.weeklyRentCents)}/wk
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Odometer readings */}
          <section className="rounded-xl border border-border bg-surface-raised p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Recent odometer readings</h2>
            {recentReadings.length === 0 ? (
              <p className="text-sm text-text-secondary">No readings recorded yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {recentReadings.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-text-secondary">{formatDateTime(r.recordedAt)}</span>
                    <span className="font-medium text-foreground tabular-nums">
                      {formatKm(r.readingKm)}
                    </span>
                    <span className="text-xs text-text-muted capitalize">{r.source}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          {/* Status change */}
          <section className="rounded-xl border border-border bg-surface-raised p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Change status</h2>
            <StatusChangeForm bikeId={bike.id} currentStatus={bike.status} />
          </section>

          {/* Service schedules (read-only — due calc lands in Milestone 4) */}
          <section className="rounded-xl border border-border bg-surface-raised p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Service schedule</h2>
            <ul className="flex flex-col divide-y divide-border">
              {schedules.map((s) => (
                <li key={s.id} className="py-2 text-sm">
                  <p className="font-medium text-foreground">{s.label}</p>
                  <p className="text-xs text-text-secondary">
                    Every {s.intervalKm.toLocaleString()} km or {s.maxIntervalDays} days · last at{" "}
                    {formatKm(s.lastServiceKm)} ({formatDate(s.lastServiceAt)})
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Status history */}
          <section className="rounded-xl border border-border bg-surface-raised p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Status history</h2>
            <ul className="flex flex-col divide-y divide-border">
              {statusHistory.map((h) => (
                <li key={h.id} className="py-2 text-sm">
                  <p className="text-foreground">
                    {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : `Registered as ${h.toStatus}`}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {formatDateTime(h.changedAt)}
                    {h.reason ? ` · ${h.reason}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
