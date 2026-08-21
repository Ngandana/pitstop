import { CircleCheck } from "lucide-react";
import { getTodayData } from "@/lib/queries/today";
import { ActionItemCard } from "@/components/today/action-item-card";
import { FleetOverview } from "@/components/today/fleet-overview";
import { formatDate } from "@/lib/format";

// Always live operational data — this is the screen the owner checks to
// decide what needs doing today, so it must never serve a stale cache.
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const { bikes, actionItems } = await getTodayData();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-hero text-foreground">Today</h1>
        <p className="mt-1 text-sm text-text-secondary">{formatDate(new Date(), "EEEE, d MMMM")}</p>
      </header>

      <section aria-labelledby="action-items-heading">
        <h2 id="action-items-heading" className="mb-3 text-sm font-semibold text-foreground">
          Needs your attention
        </h2>

        {actionItems.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success-surface p-4">
            <CircleCheck className="size-5 shrink-0 text-success" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">
              Nothing needs you right now. Here&apos;s the fleet at a glance.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {actionItems.map((item) => {
              const key =
                item.kind === "licence_expiring"
                  ? `licence-${item.driverId}`
                  : item.kind === "service"
                    ? `service-${item.scheduleId}`
                    : item.kind === "arrears"
                      ? `arrears-${item.driverId}`
                      : `stalled-${item.bikeId}`;
              return <ActionItemCard key={key} item={item} />;
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="fleet-heading">
        <h2 id="fleet-heading" className="mb-3 text-sm font-semibold text-foreground">
          Fleet at a glance
        </h2>
        <FleetOverview bikes={bikes} />
      </section>
    </div>
  );
}
