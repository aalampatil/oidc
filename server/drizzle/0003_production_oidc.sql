ALTER TABLE "users" ALTER COLUMN "password" TYPE text;
--> statement-breakpoint
ALTER TABLE "auth_codes" ADD COLUMN "code_challenge" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "auth_codes" ADD COLUMN "code_challenge_method" varchar(10) DEFAULT 'S256' NOT NULL;
--> statement-breakpoint
ALTER TABLE "auth_codes" ADD COLUMN "nonce" text;
--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "scopes" varchar(255) DEFAULT 'openid' NOT NULL;
--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "replaced_by" text;
--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "revoked_at" timestamp;
