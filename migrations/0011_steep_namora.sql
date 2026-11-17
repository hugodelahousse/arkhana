ALTER TABLE "lab_casting_decks" ADD COLUMN "anchor_file" text;--> statement-breakpoint
ALTER TABLE "lab_casting_decks" ADD COLUMN "back_file" text;--> statement-breakpoint
ALTER TABLE "lab_casting_decks" ADD COLUMN "back_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_casting_decks" ADD COLUMN "back_error" text;