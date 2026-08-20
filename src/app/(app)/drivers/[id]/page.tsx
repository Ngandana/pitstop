import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, IdCard, Phone, Bike as BikeIcon } from "lucide-react";
import { getDriverDetail } from "@/lib/queries/drivers";
import { EndAssignmentForm } from "@/components/assignments/end-assignment-form";
import { formatCents, formatDate, formatKm } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DriverDetailPage({ params }: PageProps<"/drivers/[id]">) {
  const { id } = await params;
  const detail = await getDriverDetail(id);
  if (!detail) notFound();

  const { driver, openAssignment, assignments } = detail;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/drivers"
          className="inline-flex items-center gap-1 text-sm text-text-secondary transition-colors duration-150 hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Drivers
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-hero text-foreground">{driver.fullName}</h1>
          <Link
            href={`/drivers/${driver.id}/edit`}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-surface-sunken"
          >
            <Pencil className="size-4" aria-hidden="true" />
            Edit
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <Phone className="size-4" aria-hidden="true" />
          {driver.phoneE164}
        </span>
        {driver.licenceNumber ? (
          <span className="inline-flex items-center gap-1.5">
            <IdCard className="size-4" aria-hidden="true" />
            {driver.licenceNumber}
            {driver.licenceExpiresOn ? ` · expires ${formatDate(driver.licenceExpiresOn)}` : ""}
          </span>
        ) : null}
      </div>

      <section className="rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Current bike</h2>
        {openAssignment ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  <BikeIcon className="size-4" aria-hidden="true" />
                  {openAssignment.bikeRegistration}
                </p>
                <p className="text-sm text-text-secondary">
                  Since {formatDate(openAssignment.startedAt)} · started at{" "}
                  {formatKm(openAssignment.startOdometerKm)}
                </p>
              </div>
              <p className="font-semibold text-foreground tabular-nums">
                {formatCents(openAssignment.weeklyRentCents)}/wk
              </p>
            </div>
            <EndAssignmentForm
              assignmentId={openAssignment.id}
              minOdometerKm={openAssignment.startOdometerKm}
            />
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-text-secondary">Not currently assigned a bike.</p>
            <Link
              href={`/assignments/new?driverId=${driver.id}`}
              className="inline-flex h-11 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors duration-150 hover:bg-accent/90"
            >
              Assign a bike
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Assignment history</h2>
        {assignments.length === 0 ? (
          <p className="text-sm text-text-secondary">No assignments yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {assignments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium text-foreground">{a.bikeRegistration}</p>
                  <p className="text-xs text-text-secondary">
                    {formatDate(a.startedAt)} &ndash; {a.endedAt ? formatDate(a.endedAt) : "ongoing"}
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
    </div>
  );
}
