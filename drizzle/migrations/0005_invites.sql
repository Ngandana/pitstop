CREATE TABLE "invites" (
	"email" text PRIMARY KEY NOT NULL,
	"note" text,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL
);
