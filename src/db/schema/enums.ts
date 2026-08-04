import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Bike lifecycle status. `bike_status_history` records every transition —
 * this column is always the *current* value, never hand-edited without
 * also writing a history row (see src/lib/bikes/status.ts, Milestone 2).
 */
export const bikeStatusEnum = pgEnum("bike_status", [
  "unassigned",
  "active",
  "in_service",
  "off_road",
  "stolen",
  "written_off",
  "sold",
]);

export const handoverPhotoPhaseEnum = pgEnum("handover_photo_phase", [
  "handover",
  "return",
]);

/** The six required condition-photo angles for a handover/return (§7). */
export const handoverPhotoAngleEnum = pgEnum("handover_photo_angle", [
  "front",
  "rear",
  "left",
  "right",
  "odometer",
  "damage",
]);

export const odometerSourceEnum = pgEnum("odometer_source", [
  "cartrack",
  "manual",
  "service",
  "handover",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "eft",
  "payshap",
  "capitec_pay",
  "instant_eft",
  "other",
]);

export const reminderChannelEnum = pgEnum("reminder_channel", [
  "email",
  "in_app",
]);

/** One value per trigger row in §5's reminders table. */
export const reminderTemplateEnum = pgEnum("reminder_template", [
  "weekly_rent_summary",
  "service_warning",
  "service_due",
  "service_overdue",
  "licence_expiring",
  "bike_not_moved",
  "cartrack_sync_failed",
]);
