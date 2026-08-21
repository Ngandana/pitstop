ALTER TABLE "organisations" ADD COLUMN "default_weekly_rent_cents" bigint;--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN "default_deposit_cents" bigint;--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN "notification_email" text;--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN "email_reminders_enabled" boolean DEFAULT true NOT NULL;