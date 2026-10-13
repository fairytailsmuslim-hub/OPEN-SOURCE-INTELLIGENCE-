CREATE TABLE "app_secrets" (
	"name" text PRIMARY KEY,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY,
	"event_type" text NOT NULL,
	"user_id" text,
	"ip" text,
	"country_code" text,
	"payload" jsonb,
	"hmac" text NOT NULL,
	"prev_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"cert_id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"tier" integer NOT NULL,
	"score" integer NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard" (
	"user_id" text PRIMARY KEY,
	"score" integer DEFAULT 0 NOT NULL,
	"country_code" text,
	"current_tier" integer DEFAULT 1 NOT NULL,
	"completed_tiers" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"completed_rooms" text[] DEFAULT '{}'::text[] NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY,
	"email" text NOT NULL,
	"display_name" text,
	"role" text DEFAULT 'user' NOT NULL,
	"country_code" text,
	"region_restricted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "room_seeds" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"room_id" text NOT NULL,
	"mode" text DEFAULT 'simulated' NOT NULL,
	"target_ip" text,
	"target_hash" text,
	"clues" jsonb DEFAULT '{}' NOT NULL,
	"flag_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_logs_user_event_idx" ON "audit_logs" ("user_id","event_type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_user_tier_idx" ON "certificates" ("user_id","tier");--> statement-breakpoint
CREATE INDEX "leaderboard_score_idx" ON "leaderboard" ("score");--> statement-breakpoint
CREATE UNIQUE INDEX "room_seeds_user_room_idx" ON "room_seeds" ("user_id","room_id");--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "leaderboard" ADD CONSTRAINT "leaderboard_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "room_seeds" ADD CONSTRAINT "room_seeds_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;