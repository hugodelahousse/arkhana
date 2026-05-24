CREATE TABLE IF NOT EXISTS "spread_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"spread_id" integer NOT NULL,
	"user_card_id" integer NOT NULL,
	"position" integer NOT NULL,
	"position_key" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spreads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"spread_type" text NOT NULL,
	"spread_date" text NOT NULL,
	"pulled_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "username" text;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "display_username" text;
--> statement-breakpoint
ALTER TABLE "user_cards" ADD COLUMN IF NOT EXISTS "pull_type" text DEFAULT 'daily' NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'spread_cards_spread_id_spreads_id_fk') THEN
    ALTER TABLE "spread_cards" ADD CONSTRAINT "spread_cards_spread_id_spreads_id_fk" FOREIGN KEY ("spread_id") REFERENCES "public"."spreads"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'spread_cards_user_card_id_user_cards_id_fk') THEN
    ALTER TABLE "spread_cards" ADD CONSTRAINT "spread_cards_user_card_id_user_cards_id_fk" FOREIGN KEY ("user_card_id") REFERENCES "public"."user_cards"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'spreads_user_id_user_id_fk') THEN
    ALTER TABLE "spreads" ADD CONSTRAINT "spreads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "spread_cards_spread_position_idx" ON "spread_cards" USING btree ("spread_id","position");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "spread_cards_user_card_idx" ON "spread_cards" USING btree ("user_card_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "spreads_user_type_date_idx" ON "spreads" USING btree ("user_id","spread_type","spread_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spreads_user_type_idx" ON "spreads" USING btree ("user_id","spread_type");
--> statement-breakpoint
DROP INDEX IF EXISTS "user_cards_user_day_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX "user_cards_user_day_idx" ON "user_cards" USING btree ("user_id","pull_date") WHERE "user_cards"."pull_type" = 'daily';
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_username_unique') THEN
    ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");
  END IF;
END $$;
