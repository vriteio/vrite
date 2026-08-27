ALTER TYPE "public"."permission" ADD VALUE 'restricted_collections' BEFORE 'workspace';--> statement-breakpoint
ALTER TYPE "public"."permission" ADD VALUE 'read:restricted_collections' BEFORE 'workspace';--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "restricted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_root_not_restricted" CHECK ("collections"."parent_id" is not null or not "collections"."restricted");
