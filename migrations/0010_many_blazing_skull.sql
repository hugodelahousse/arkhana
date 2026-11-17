ALTER TABLE "lab_casting_decks" ADD COLUMN "preset_id" text DEFAULT 'linocut-2c' NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_casting_decks" ADD COLUMN "frame_id" text;--> statement-breakpoint
ALTER TABLE "lab_casting_decks" ADD COLUMN "anchor_file" text;--> statement-breakpoint
ALTER TABLE "lab_casting_decks" ADD COLUMN "back_file" text;--> statement-breakpoint
ALTER TABLE "lab_casting_decks" ADD COLUMN "back_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_casting_decks" ADD COLUMN "back_error" text;--> statement-breakpoint
ALTER TABLE "lab_casting_proposals" ADD COLUMN "scene" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_casting_proposals" ADD COLUMN "art_file" text;--> statement-breakpoint
ALTER TABLE "lab_casting_proposals" ADD COLUMN "art_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_casting_proposals" ADD COLUMN "art_error" text;