import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatKm } from "@/lib/format";
import type { ServiceStatus } from "@/lib/servicing/due-calc";

const STATUS_STYLES: Record<ServiceStatus, string> = {
  ok: "text-success",
  warning: "text-warning",
  due: "text-due",
  overdue: "text-danger",
};

const STATUS_LABEL: Record<ServiceStatus, string> = {
  ok: "On track",
  warning: "Due soon",
  due: "Due now",
  overdue: "Overdue",
};

export type NextService = { label: string; status: ServiceStatus; kmRemaining: number | null };

/** Status is always paired with an icon and text label — never colour alone (§6). */
export function ServiceIndicator({ nextService }: { nextService: NextService | null }) {
  if (!nextService) {
    return <span className="text-xs text-text-muted">No schedule</span>;
  }

  const { status, kmRemaining } = nextService;
  const kmLabel =
    kmRemaining === null
      ? ""
      : kmRemaining >= 0
        ? ` · ${formatKm(kmRemaining)} left`
        : ` · ${formatKm(Math.abs(kmRemaining))} over`;

  return (
    <div className="flex items-center gap-1.5">
      <Wrench className={cn("size-3.5 shrink-0", STATUS_STYLES[status])} aria-hidden="true" />
      <span className={cn("text-xs font-medium whitespace-nowrap", STATUS_STYLES[status])}>
        {STATUS_LABEL[status]}
        {kmLabel}
      </span>
    </div>
  );
}
