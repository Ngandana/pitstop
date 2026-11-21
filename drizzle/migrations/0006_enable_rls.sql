-- Lock every app table against Supabase's public (PostgREST) API.
-- The app reads/writes through the server's Postgres role (BYPASSRLS), so
-- enabling RLS with NO policies denies the browser-exposed anon/authenticated
-- roles entirely while leaving the app unaffected.
ALTER TABLE "organisations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "drivers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bikes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bike_status_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "handover_photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "odometer_readings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "service_types" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "service_schedules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rent_charges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reminders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "telematics_sync_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invites" ENABLE ROW LEVEL SECURITY;
