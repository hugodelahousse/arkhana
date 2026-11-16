CREATE TABLE "lab_casting_decks" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"theme" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_casting_proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"deck_id" text NOT NULL,
	"card_id" integer NOT NULL,
	"name" text NOT NULL,
	"pitch" text DEFAULT '' NOT NULL,
	"proposer_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_casting_rankings" (
	"deck_id" text NOT NULL,
	"card_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"order" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lab_casting_rankings_deck_id_card_id_user_id_pk" PRIMARY KEY("deck_id","card_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "lab_casting_decks" ADD CONSTRAINT "lab_casting_decks_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_casting_proposals" ADD CONSTRAINT "lab_casting_proposals_deck_id_lab_casting_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."lab_casting_decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_casting_proposals" ADD CONSTRAINT "lab_casting_proposals_proposer_id_user_id_fk" FOREIGN KEY ("proposer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_casting_rankings" ADD CONSTRAINT "lab_casting_rankings_deck_id_lab_casting_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."lab_casting_decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_casting_rankings" ADD CONSTRAINT "lab_casting_rankings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lab_casting_decks_owner_idx" ON "lab_casting_decks" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "lab_casting_proposals_deck_card_idx" ON "lab_casting_proposals" USING btree ("deck_id","card_id");--> statement-breakpoint
CREATE INDEX "lab_casting_proposals_proposer_idx" ON "lab_casting_proposals" USING btree ("proposer_id");--> statement-breakpoint
CREATE INDEX "lab_casting_rankings_user_idx" ON "lab_casting_rankings" USING btree ("user_id");