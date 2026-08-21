import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { serviceTypes, users } from "@/db/schema";
import { getCurrentOrg } from "@/lib/queries/org";
import { ServiceTypeEditForm } from "@/components/settings/service-type-edit-form";
import { RentPolicyForm } from "@/components/settings/rent-policy-form";
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";

export const dynamic = "force-dynamic";

function centsToRands(cents: number | null): number | null {
  return cents === null ? null : cents / 100;
}

export default async function SettingsPage() {
  const org = await getCurrentOrg();
  const [types, owner] = await Promise.all([
    db.query.serviceTypes.findMany({
      where: eq(serviceTypes.orgId, org.id),
      orderBy: asc(serviceTypes.label),
    }),
    db.query.users.findFirst({ where: eq(users.orgId, org.id) }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-hero text-foreground">Settings</h1>

      <section className="rounded-xl border border-border bg-surface-raised p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">Service interval defaults</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Seeds the schedule on every newly registered bike. Doesn&apos;t change any bike you&apos;ve
          already added — edit those individually from the bike&apos;s own page.
        </p>
        <ul className="mt-4 flex flex-col divide-y divide-border">
          {types.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{t.label}</p>
                <p className="text-xs text-text-secondary">
                  Every {t.defaultIntervalKm.toLocaleString()} km or {t.defaultMaxIntervalDays} days
                </p>
              </div>
              <ServiceTypeEditForm
                serviceTypeId={t.id}
                label={t.label}
                defaultIntervalKm={t.defaultIntervalKm}
                defaultMaxIntervalDays={t.defaultMaxIntervalDays}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-surface-raised p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">Rent policy defaults</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Optional starting point for a new handover — leave blank if it varies too much to default.
        </p>
        <div className="mt-4">
          <RentPolicyForm
            defaultWeeklyRentRands={centsToRands(org.defaultWeeklyRentCents)}
            defaultDepositRands={centsToRands(org.defaultDepositCents)}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-raised p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">Notification preferences</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Driver-facing reminders are still sent manually via the &quot;Send to driver&quot; buttons on
          Today — this only controls the emails Pitstop sends you.
        </p>
        <div className="mt-4">
          <NotificationPreferencesForm
            loginEmail={owner?.email ?? "your login email"}
            notificationEmail={org.notificationEmail}
            emailRemindersEnabled={org.emailRemindersEnabled}
          />
        </div>
      </section>
    </div>
  );
}
