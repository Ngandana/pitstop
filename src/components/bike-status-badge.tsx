import { Ban, Circle, CircleAlert, CircleCheck, CircleDollarSign, ShieldAlert, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { bikeStatusEnum } from "@/db/schema";

type BikeStatus = (typeof bikeStatusEnum.enumValues)[number];

const STATUS_CONFIG: Record<
  BikeStatus,
  { label: string; icon: typeof Circle; className: string }
> = {
  unassigned: { label: "Unassigned", icon: Circle, className: "bg-muted text-text-secondary" },
  active: { label: "Active", icon: CircleCheck, className: "bg-success-surface text-success" },
  in_service: { label: "In service", icon: Wrench, className: "bg-info-surface text-info" },
  off_road: { label: "Off road", icon: CircleAlert, className: "bg-warning-surface text-warning" },
  stolen: { label: "Stolen", icon: ShieldAlert, className: "bg-danger-surface text-danger" },
  written_off: { label: "Written off", icon: Ban, className: "bg-danger-surface text-danger" },
  sold: { label: "Sold", icon: CircleDollarSign, className: "bg-muted text-text-secondary" },
};

/** Status is always paired with an icon and a text label — never colour alone (§6). */
export function BikeStatusBadge({ status }: { status: BikeStatus }) {
  const { label, icon: Icon, className } = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
