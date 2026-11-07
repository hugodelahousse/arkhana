CREATE TABLE "lab_deck_cards" (
	"deck_id" text NOT NULL,
	"card_id" integer NOT NULL,
	"name" text NOT NULL,
	"meaning" text DEFAULT '' NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"composition" text DEFAULT '' NOT NULL,
	"fidelity_notes" text DEFAULT '' NOT NULL,
	"back_text" text DEFAULT '' NOT NULL,
	"cast_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"approved_draft_id" text,
	"final_image_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lab_deck_cards_deck_id_card_id_pk" PRIMARY KEY("deck_id","card_id")
);
--> statement-breakpoint
CREATE TABLE "lab_deck_cast" (
	"id" text PRIMARY KEY NOT NULL,
	"deck_id" text NOT NULL,
	"kind" text DEFAULT 'character' NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"ref_image_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"plate_image_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_deck_images" (
	"id" text PRIMARY KEY NOT NULL,
	"deck_id" text NOT NULL,
	"kind" text NOT NULL,
	"card_id" integer,
	"cast_id" text,
	"status" text DEFAULT 'done' NOT NULL,
	"file" text,
	"model" text,
	"quality" text,
	"size" text,
	"prompt" text,
	"ref_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"critique" jsonb,
	"error" text,
	"cost_micros" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_deck_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"deck_id" text NOT NULL,
	"image_id" text,
	"purpose" text NOT NULL,
	"model" text NOT NULL,
	"usage" jsonb NOT NULL,
	"estimate_micros" integer DEFAULT 0 NOT NULL,
	"cost_micros" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_decks" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text,
	"title" text DEFAULT 'Untitled deck' NOT NULL,
	"theme" text DEFAULT '' NOT NULL,
	"preset_id" text DEFAULT 'linocut-2c' NOT NULL,
	"frame_id" text,
	"style_bible" jsonb,
	"anchor_image_id" text,
	"style_suggestions" jsonb,
	"budget_micros" integer DEFAULT 10000000 NOT NULL,
	"back_style" text DEFAULT 'standard' NOT NULL,
	"back_image_id" text,
	"view" text DEFAULT 'chat' NOT NULL,
	"wizard_step" text DEFAULT 'style' NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lab_deck_cards" ADD CONSTRAINT "lab_deck_cards_deck_id_lab_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."lab_decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_deck_cast" ADD CONSTRAINT "lab_deck_cast_deck_id_lab_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."lab_decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_deck_images" ADD CONSTRAINT "lab_deck_images_deck_id_lab_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."lab_decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_deck_ledger" ADD CONSTRAINT "lab_deck_ledger_deck_id_lab_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."lab_decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_decks" ADD CONSTRAINT "lab_decks_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lab_deck_cast_deck_idx" ON "lab_deck_cast" USING btree ("deck_id");--> statement-breakpoint
CREATE INDEX "lab_deck_images_deck_idx" ON "lab_deck_images" USING btree ("deck_id","kind");--> statement-breakpoint
CREATE INDEX "lab_deck_ledger_deck_idx" ON "lab_deck_ledger" USING btree ("deck_id");