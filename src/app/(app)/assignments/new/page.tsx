import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getAvailableBikesAndDrivers } from "@/lib/queries/assignments";
import { getCurrentOrg } from "@/lib/queries/org";
import { AssignmentForm } from "@/components/assignments/assignment-form";

export const dynamic = "force-dynamic";

export default async function NewAssignmentPage({
  searchParams,
}: PageProps<"/assignments/new">) {
  const { bikeId, driverId } = await searchParams;
  const org = await getCurrentOrg();
  const { availableBikes, availableDrivers } = await getAvailableBikesAndDrivers(org.id);

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
        <h1 className="mt-2 text-hero text-foreground">Hand over a bike</h1>
      </div>

      <div className="max-w-2xl rounded-xl border border-border bg-surface-raised p-6">
        <AssignmentForm
          bikes={availableBikes}
          drivers={availableDrivers}
          defaultBikeId={typeof bikeId === "string" ? bikeId : undefined}
          defaultDriverId={typeof driverId === "string" ? driverId : undefined}
          defaultWeeklyRentRands={org.defaultWeeklyRentCents !== null ? org.defaultWeeklyRentCents / 100 : null}
          defaultDepositRands={org.defaultDepositCents !== null ? org.defaultDepositCents / 100 : null}
        />
      </div>
    </div>
  );
}
