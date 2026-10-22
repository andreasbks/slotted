CREATE TABLE "access_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"poll_id" text NOT NULL,
	"clerk_user_id" text,
	"guest_session_id" text NOT NULL,
	"name" text NOT NULL,
	"city" text DEFAULT 'NYC' NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"avatar_color" text DEFAULT '#10B981' NOT NULL,
	"slots" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"poll_mode" text DEFAULT 'dates_and_hours' NOT NULL,
	"schedule_type" text DEFAULT 'specific_dates' NOT NULL,
	"recurrence_rule" jsonb DEFAULT 'null'::jsonb,
	"host_clerk_user_id" text,
	"host_token_hash" text NOT NULL,
	"host_name" text DEFAULT 'Host' NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"candidate_dates" jsonb NOT NULL,
	"day_start_hour" integer DEFAULT 9 NOT NULL,
	"day_end_hour" integer DEFAULT 17 NOT NULL,
	"slot_minutes" integer DEFAULT 30 NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"access_password_hash" text,
	"visibility_mode" text DEFAULT 'public' NOT NULL,
	"allow_if_needed" boolean DEFAULT true NOT NULL,
	"deadline_at" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"locked_slot_start" text,
	"locked_slot_end" text,
	"locked_location" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "polls_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"bucket_key" text PRIMARY KEY NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recovery_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"selector" text NOT NULL,
	"verifier_hash" text NOT NULL,
	"device_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "recovery_credentials_selector_unique" UNIQUE("selector")
);
--> statement-breakpoint
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_slug_polls_slug_fk" FOREIGN KEY ("slug") REFERENCES "public"."polls"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_participants" ADD CONSTRAINT "poll_participants_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "access_grant_slug_token_idx" ON "access_grants" USING btree ("slug","token_hash");--> statement-breakpoint
CREATE INDEX "access_grant_slug_idx" ON "access_grants" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "poll_guest_idx" ON "poll_participants" USING btree ("poll_id","guest_session_id");--> statement-breakpoint
CREATE INDEX "recovery_device_idx" ON "recovery_credentials" USING btree ("device_hash");