CREATE TYPE "public"."bike_status" AS ENUM('unassigned', 'active', 'in_service', 'off_road', 'stolen', 'written_off', 'sold');--> statement-breakpoint
CREATE TYPE "public"."handover_photo_angle" AS ENUM('front', 'rear', 'left', 'right', 'odometer', 'damage');--> statement-breakpoint
CREATE TYPE "public"."handover_photo_phase" AS ENUM('handover', 'return');--> statement-breakpoint
CREATE TYPE "public"."odometer_source" AS ENUM('cartrack', 'manual', 'service', 'handover');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'eft', 'payshap', 'capitec_pay', 'instant_eft', 'other');--> statement-breakpoint
CREATE TYPE "public"."reminder_channel" AS ENUM('email', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."reminder_template" AS ENUM('weekly_rent_summary', 'service_warning', 'service_due', 'service_overdue', 'licence_expiring', 'bike_not_moved', 'cartrack_sync_failed');--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'Africa/Johannesburg' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"phone_e164" text NOT NULL,
	"licence_number" text,
	"licence_expires_on" date,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"tracking_consent_at" timestamp with time zone,
	"tracking_consent_version" text,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bike_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bike_id" uuid NOT NULL,
	"from_status" "bike_status",
	"to_status" "bike_status" NOT NULL,
	"reason" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bikes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"registration" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"engine_cc" integer,
	"year" integer,
	"colour" text,
	"vin" text,
	"purchase_date" date,
	"purchase_price_cents" bigint,
	"cartrack_vehicle_id" text,
	"status" "bike_status" DEFAULT 'unassigned' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"bike_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"end_reason" text,
	"weekly_rent_cents" bigint NOT NULL,
	"rent_due_weekday" integer DEFAULT 3 NOT NULL,
	"deposit_cents" bigint DEFAULT 0 NOT NULL,
	"start_odometer_km" integer NOT NULL,
	"end_odometer_km" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "handover_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"phase" "handover_photo_phase" NOT NULL,
	"angle" "handover_photo_angle" NOT NULL,
	"storage_key" text NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "odometer_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"bike_id" uuid NOT NULL,
	"reading_km" integer NOT NULL,
	"source" "odometer_source" NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"override_flag" boolean DEFAULT false NOT NULL,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"bike_id" uuid NOT NULL,
	"service_type_id" uuid NOT NULL,
	"interval_km" integer NOT NULL,
	"max_interval_days" integer NOT NULL,
	"last_service_km" integer NOT NULL,
	"last_service_at" date NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"default_interval_km" integer NOT NULL,
	"default_max_interval_days" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"bike_id" uuid NOT NULL,
	"service_type_id" uuid NOT NULL,
	"odometer_km" integer NOT NULL,
	"performed_at" date NOT NULL,
	"cost_cents" bigint,
	"workshop_name" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"amount_cents" bigint NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"period_start" date,
	"period_end" date,
	"proof_storage_key" text,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rent_charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"amount_cents" bigint NOT NULL,
	"waived_cents" bigint DEFAULT 0 NOT NULL,
	"waive_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"template" "reminder_template" NOT NULL,
	"channel" "reminder_channel" NOT NULL,
	"recipient" text NOT NULL,
	"payload" jsonb NOT NULL,
	"dedupe_key" text,
	"due_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bike_status_history" ADD CONSTRAINT "bike_status_history_bike_id_bikes_id_fk" FOREIGN KEY ("bike_id") REFERENCES "public"."bikes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bikes" ADD CONSTRAINT "bikes_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_bike_id_bikes_id_fk" FOREIGN KEY ("bike_id") REFERENCES "public"."bikes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handover_photos" ADD CONSTRAINT "handover_photos_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odometer_readings" ADD CONSTRAINT "odometer_readings_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odometer_readings" ADD CONSTRAINT "odometer_readings_bike_id_bikes_id_fk" FOREIGN KEY ("bike_id") REFERENCES "public"."bikes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_schedules" ADD CONSTRAINT "service_schedules_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_schedules" ADD CONSTRAINT "service_schedules_bike_id_bikes_id_fk" FOREIGN KEY ("bike_id") REFERENCES "public"."bikes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_schedules" ADD CONSTRAINT "service_schedules_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_bike_id_bikes_id_fk" FOREIGN KEY ("bike_id") REFERENCES "public"."bikes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_charges" ADD CONSTRAINT "rent_charges_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_charges" ADD CONSTRAINT "rent_charges_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_charges" ADD CONSTRAINT "rent_charges_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bikes_org_registration_unique" ON "bikes" USING btree ("org_id","registration");--> statement-breakpoint
CREATE UNIQUE INDEX "one_open_assignment_per_bike" ON "assignments" USING btree ("bike_id") WHERE "assignments"."ended_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "one_open_assignment_per_driver" ON "assignments" USING btree ("driver_id") WHERE "assignments"."ended_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "reminders_dedupe" ON "reminders" USING btree ("dedupe_key") WHERE "reminders"."dedupe_key" IS NOT NULL;