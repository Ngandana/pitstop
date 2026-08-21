import "server-only";
import { and, asc, eq, gte, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { reminders } from "@/db/schema";
import { sendEmail } from "@/lib/email/resend";
import { renderReminderEmail, type ReminderPayloadMap, type ReminderTemplate } from "@/lib/email/templates";

const MAX_ATTEMPTS = 5;

export type SweepSummary = {
  sent: number;
  failed: number;
  /** Rows that hit MAX_ATTEMPTS on a previous run and are no longer retried — worth a human look. */
  deadLettered: number;
};

/**
 * The other half of the outbox pattern (§5): generation only writes
 * rows, this reads pending `email` rows and actually sends them via
 * Resend. Never sends the same row twice — a row is only ever picked up
 * while `sent_at IS NULL`, and each attempt is recorded so a
 * permanently-failing row (bad address, Resend outage) stops retrying
 * after MAX_ATTEMPTS rather than hammering the API forever.
 */
export async function sweepReminders(): Promise<SweepSummary> {
  const pending = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.channel, "email"), isNull(reminders.sentAt), lt(reminders.attempts, MAX_ATTEMPTS)))
    .orderBy(asc(reminders.dueAt));

  let sent = 0;
  let failed = 0;

  for (const row of pending) {
    const { subject, html } = renderReminderEmail(
      row.template as ReminderTemplate,
      row.payload as ReminderPayloadMap[ReminderTemplate],
    );
    const result = await sendEmail({ to: row.recipient, subject, html });

    if (result.ok) {
      await db
        .update(reminders)
        .set({ sentAt: new Date(), attempts: row.attempts + 1, lastError: null })
        .where(eq(reminders.id, row.id));
      sent++;
    } else {
      await db
        .update(reminders)
        .set({ attempts: row.attempts + 1, failedAt: new Date(), lastError: result.error })
        .where(eq(reminders.id, row.id));
      failed++;
    }
  }

  const deadLettered = await db.$count(
    reminders,
    and(eq(reminders.channel, "email"), isNull(reminders.sentAt), gte(reminders.attempts, MAX_ATTEMPTS)),
  );

  return { sent, failed, deadLettered };
}
