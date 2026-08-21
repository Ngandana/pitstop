import { AlertTriangle, CircleDollarSign, IdCard, MessageCircle, Wrench } from "lucide-react";
import Link from "next/link";
import type { ActionItem } from "@/lib/queries/today";
import { formatCents, formatDate, formatKm } from "@/lib/format";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const URGENT_THRESHOLD_DAYS = 7;

/** Status colour ramp — amber (warning) -> orange (due) -> red (overdue), always paired with icon + label (§6). */
const SEVERITY_CLASSES = {
  warning: "border-warning/30 bg-warning-surface text-warning",
  due: "border-due/30 bg-due-surface text-due",
  danger: "border-danger/30 bg-danger-surface text-danger",
} as const;

/**
 * §5: "Driver notification is manual by design" — every card whose
 * trigger concerns a driver (not the cartrack_sync_failed / owner-only
 * kind of alert) gets one of these, opening wa.me with a pre-written
 * message. No messaging API integration.
 */
function SendToDriverButton({ phoneE164, message }: { phoneE164: string; message: string }) {
  return (
    <Button asChild variant="outline" size="sm" className="mt-2">
      <a href={buildWhatsAppLink(phoneE164, message)} target="_blank" rel="noopener noreferrer">
        <MessageCircle aria-hidden="true" />
        Send to driver
      </a>
    </Button>
  );
}

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
          <SendToDriverButton
            phoneE164={item.phoneE164}
            message={`Hi ${item.driverName}, your driver's licence ${dayLabel}. Please renew it and send through a copy when you can. - Pitstop`}
          />
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
          {item.phoneE164 && item.driverName && (
            <SendToDriverButton
              phoneE164={item.phoneE164}
              message={`Hi ${item.driverName}, ${item.registration} is ${statusLabel} for a service (${item.serviceLabel}). Please bring it in when you can. - Pitstop`}
            />
          )}
        </div>
      </li>
    );
  }

  if (item.kind === "arrears") {
    const severity = item.daysInArrears >= 14 ? "danger" : "warning";
    return (
      <li className={cn("flex items-start gap-3 rounded-lg border p-4", SEVERITY_CLASSES[severity])}>
        <CircleDollarSign className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <Link
            href={`/drivers/${item.driverId}`}
            className="text-sm font-medium text-foreground hover:underline"
          >
            {item.driverName} is {item.daysInArrears} day{item.daysInArrears === 1 ? "" : "s"} behind
          </Link>
          <p className="mt-0.5 text-xs text-text-secondary">
            Owes {formatCents(item.balanceCents)} &middot; {item.phoneE164}
          </p>
          <SendToDriverButton
            phoneE164={item.phoneE164}
            message={`Hi ${item.driverName}, your rent account is ${item.daysInArrears} day${item.daysInArrears === 1 ? "" : "s"} behind - you owe ${formatCents(item.balanceCents)}. Please settle when you can. - Pitstop`}
          />
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
        <SendToDriverButton
          phoneE164={item.phoneE164}
          message={`Hi ${item.driverName}, ${item.registration} hasn't shown any movement since ${formatDate(item.lastReadingAt, "d MMM, HH:mm")}. Please check in when you get a chance. - Pitstop`}
        />
      </div>
    </li>
  );
}
