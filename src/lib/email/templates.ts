import { formatCents, formatDate, formatKm } from "@/lib/format";

/**
 * One payload shape per reminderTemplateEnum value — this is exactly
 * what gets stored in reminders.payload, so the sweep cron can render
 * the email without re-querying anything (§5's outbox pattern).
 */
export type ReminderPayloadMap = {
  weekly_rent_summary: {
    drivers: { name: string; balanceCents: number; daysInArrears: number }[];
  };
  service_warning: { bikeId: string; registration: string; serviceLabel: string; kmRemaining: number | null };
  service_due: { bikeId: string; registration: string; serviceLabel: string; kmRemaining: number | null };
  service_overdue: { bikeId: string; registration: string; serviceLabel: string; kmRemaining: number | null };
  licence_expiring: { driverId: string; driverName: string; daysUntil: number; expiresOn: string };
  bike_not_moved: { bikeId: string; registration: string; lastReadingAt: string };
  cartrack_sync_failed: { bikeId: string; registration: string };
};

export type ReminderTemplate = keyof ReminderPayloadMap;

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f1efec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1efec;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#0f766e;padding:20px 24px;">
                <span style="color:#fefdfb;font-size:18px;font-weight:700;">Pitstop</span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 12px;font-size:18px;color:#1c1917;">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 0;color:#57534e;font-size:14px;">${label}</td><td style="padding:6px 0;text-align:right;font-size:14px;font-weight:600;color:#1c1917;">${value}</td></tr>`;
}

export function renderReminderEmail<T extends ReminderTemplate>(
  template: T,
  payload: ReminderPayloadMap[T],
): { subject: string; html: string } {
  switch (template) {
    case "weekly_rent_summary": {
      const p = payload as ReminderPayloadMap["weekly_rent_summary"];
      const owing = p.drivers.filter((d) => d.balanceCents > 0);
      const rows =
        owing.length === 0
          ? `<p style="color:#57534e;font-size:14px;">Nobody owes anything this week.</p>`
          : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${owing
              .map((d) => row(`${d.name} (${d.daysInArrears}d behind)`, formatCents(d.balanceCents)))
              .join("")}</table>`;
      return {
        subject: `Weekly rent summary — ${owing.length} driver${owing.length === 1 ? "" : "s"} owing`,
        html: shell("Weekly rent summary", rows),
      };
    }
    case "service_warning":
    case "service_due":
    case "service_overdue": {
      const p = payload as ReminderPayloadMap["service_due"];
      const statusLabel = template === "service_warning" ? "coming up" : template === "service_due" ? "due now" : "overdue";
      const kmLabel =
        p.kmRemaining === null
          ? ""
          : p.kmRemaining >= 0
            ? `<p style="color:#57534e;font-size:14px;">${formatKm(p.kmRemaining)} left</p>`
            : `<p style="color:#b91c1c;font-size:14px;">${formatKm(Math.abs(p.kmRemaining))} over</p>`;
      return {
        subject: `${p.registration}: ${p.serviceLabel} ${statusLabel}`,
        html: shell(`${p.registration}: ${p.serviceLabel} ${statusLabel}`, kmLabel),
      };
    }
    case "licence_expiring": {
      const p = payload as ReminderPayloadMap["licence_expiring"];
      return {
        subject: `${p.driverName}'s licence expires in ${p.daysUntil} day${p.daysUntil === 1 ? "" : "s"}`,
        html: shell(
          `${p.driverName}'s licence expires soon`,
          `<p style="color:#57534e;font-size:14px;">Expires ${formatDate(p.expiresOn)} (${p.daysUntil} day${p.daysUntil === 1 ? "" : "s"} away).</p>`,
        ),
      };
    }
    case "bike_not_moved": {
      const p = payload as ReminderPayloadMap["bike_not_moved"];
      return {
        subject: `${p.registration} hasn't moved in over 48 hours`,
        html: shell(
          `${p.registration} hasn't moved`,
          `<p style="color:#57534e;font-size:14px;">Last reading: ${formatDate(p.lastReadingAt, "d MMM yyyy, HH:mm")}.</p>`,
        ),
      };
    }
    case "cartrack_sync_failed": {
      const p = payload as ReminderPayloadMap["cartrack_sync_failed"];
      return {
        subject: `Cartrack sync failing for ${p.registration}`,
        html: shell(
          `Cartrack sync failing for ${p.registration}`,
          `<p style="color:#57534e;font-size:14px;">Two nights in a row now — check the bike's tracker or enter its odometer manually until it's sorted.</p>`,
        ),
      };
    }
  }
}
