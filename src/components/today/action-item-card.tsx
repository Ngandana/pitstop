import { AlertTriangle, IdCard, Wrench } from "lucide-react";
import Link from "next/link";
import type { ActionItem } from "@/lib/queries/today";
import { formatDate, formatKm } from "@/lib/format";
import { cn } from "@/lib/utils";

const URGENT_THRESHOLD_DAYS = 7;

/** Status colour ramp — amber (warning) -> orange (due) -> red (overdue), always paired with icon + label (§6). */
const SEVERITY_CLASSES = {
  warning: "border-warning/30 bg-warning-surface text-warning",
  due: "border-due/30 bg-due-surface text-due",
  danger: "border-danger/30 bg-danger-surface text-danger",
} as const;

export function ActionItemCard({ item }: { item: ActionItem }) {
  if (item.kind === "licence_expiring") {
    const urgent = item.daysUntil <= URGENT_THRESHOLD_DAYS;
    const severity = urgent ? "danger" : "warning";
    const dayLabel =
      item.daysUntil < 0
        ? `expired ${Math.abs(item.daysUntil)} day${Math.abs(item.daysUntil) === 1 ? "" : "s"} ago`
        : item.daysUntil === 0
          ? "expires today"
          : `expires in ${item.daysUntil} day${item.daysUntil === 1 ? "" : "s"}`;

    return (
      <li className={cn("flex items-start gap-3 rounded-lg border p-4", SEVERITY_CLASSES[severity])}>
        <IdCard className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {item.driverName}&apos;s licence {dayLabel}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            Expires {formatDate(item.expiresOn)} &middot; {item.phoneE164}
          </p>
        </div>
      </li>
    );
  }

  if (item.kind === "service") {
    const severity = item.status === "overdue" ? "danger" : item.status === "due" ? "due" : "warning";
    const statusLabel =
      item.status === "overdue" ? "overdue" : item.status === "due" ? "due now" : "due soon";
    const kmLabel =
      item.kmRemaining === null
        ? ""
        : item.kmRemaining >= 0
          ? ` · ${formatKm(item.kmRemaining)} left`
          : ` · ${formatKm(Math.abs(item.kmRemaining))} over`;

    return (
      <li className={cn("flex items-start gap-3 rounded-lg border p-4", SEVERITY_CLASSES[severity])}>
        <Wrench className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <Link href={`/fleet/${item.bikeId}`} className="text-sm font-medium text-foreground hover:underline">
            {item.registration}: {item.serviceLabel} {statusLabel}
          </Link>
          <p className="mt-0.5 text-xs text-text-secondary">Service{kmLabel}</p>
        </div>
      </li>
    );
  }

  return (
    <li className={cn("flex items-start gap-3 rounded-lg border p-4", SEVERITY_CLASSES.warning)}>
      <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          {item.registration} hasn&apos;t moved in over 48 hours
        </p>
        <p className="mt-0.5 text-xs text-text-secondary">
          Last reading {formatDate(item.lastReadingAt, "d MMM, HH:mm")}
        </p>
      </div>
    </li>
  );
}
