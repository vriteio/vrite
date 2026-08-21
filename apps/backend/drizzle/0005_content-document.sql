ALTER TABLE "contents" ADD COLUMN "document" jsonb;--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN "hash" varchar(64);
