import { CircleCheck, TriangleAlert, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatKm } from "@/lib/format";
import type { ServiceScheduleStatus } from "@/lib/queries/servicing";
import { ScheduleEditForm } from "./schedule-edit-form";

const STATUS_CONFIG = {
  ok: { icon: CircleCheck, text: "text-success", bar: "bg-success", label: "On track" },
  warning: { icon: TriangleAlert, text: "text-warning", bar: "bg-warning", label: "Due soon" },
  due: { icon: Wrench, text: "text-due", bar: "bg-due", label: "Due now" },
  overdue: { icon: TriangleAlert, text: "text-danger", bar: "bg-danger", label: "Overdue" },
} as const;

export function ServiceScheduleList({ schedules }: { schedules: ServiceScheduleStatus[] }) {
  if (schedules.length === 0) {
    return <p className="text-sm text-text-secondary">No service schedule yet.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {schedules.map((s) => {
        const { icon: Icon, text, bar, label } = STATUS_CONFIG[s.status];
        const widthPct = Math.min(Math.max(s.progress, 0), 1) * 100;
        const kmLabel =
          s.kmRemaining === null
            ? "no odometer reading yet"
            : s.kmRemaining >= 0
              ? `${formatKm(s.kmRemaining)} left`
              : `${formatKm(Math.abs(s.kmRemaining))} overdue`;

        return (
          <li key={s.scheduleId} className="py-3">
            <div className="flex items-center justify-between gap-2">
              <p className={cn("inline-flex items-center gap-1.5 text-sm font-medium", text)}>
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {s.label}
              </p>
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-medium", text)}>{label}</span>
                <ScheduleEditForm
                  scheduleId={s.scheduleId}
                  bikeId={s.bikeId}
                  label={s.label}
                  intervalKm={s.intervalKm}
                  maxIntervalDays={s.maxIntervalDays}
                />
              </div>
            </div>

            <div
              className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
              role="progressbar"
              aria-valuenow={Math.round(widthPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${s.label} service progress`}
            >
              <div className={cn("h-full rounded-full", bar)} style={{ width: `${widthPct}%` }} />
            </div>

            <p className="mt-1.5 text-xs text-text-secondary">
              {kmLabel} · every {s.intervalKm.toLocaleString()} km or {s.maxIntervalDays} days · last at{" "}
              {formatKm(s.lastServiceKm)} ({formatDate(s.lastServiceAt)})
            </p>
          </li>
        );
      })}
    </ul>
  );
}
