import { AlertTriangle, IdCard } from "lucide-react";
import type { ActionItem } from "@/lib/queries/today";
import { formatDate } from "@/lib/format";

const URGENT_THRESHOLD_DAYS = 7;

export function ActionItemCard({ item }: { item: ActionItem }) {
  if (item.kind === "licence_expiring") {
    const urgent = item.daysUntil <= URGENT_THRESHOLD_DAYS;
    const dayLabel =
      item.daysUntil < 0
        ? `expired ${Math.abs(item.daysUntil)} day${Math.abs(item.daysUntil) === 1 ? "" : "s"} ago`
        : item.daysUntil === 0
          ? "expires today"
          : `expires in ${item.daysUntil} day${item.daysUntil === 1 ? "" : "s"}`;

    return (
      <li
        className={`flex items-start gap-3 rounded-lg border p-4 ${
          urgent ? "border-danger/30 bg-danger-surface" : "border-warning/30 bg-warning-surface"
        }`}
      >
        <IdCard
          className={`mt-0.5 size-5 shrink-0 ${urgent ? "text-danger" : "text-warning"}`}
          aria-hidden="true"
        />
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

  return (
    <li className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-surface p-4">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
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
