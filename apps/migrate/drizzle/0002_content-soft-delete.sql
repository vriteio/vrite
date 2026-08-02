ALTER TABLE "collections" DROP CONSTRAINT "collections_sibling_rank_unique";--> statement-breakpoint
DROP INDEX "collections_single_root_unique";--> statement-breakpoint
DROP INDEX "entries_collection_rank_unique";--> statement-breakpoint
DROP INDEX "entries_root_rank_unique";--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "collections_sibling_rank_unique" ON "collections" USING btree ("workspace_id","parent_id","rank") WHERE "collections"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "collections_single_root_unique" ON "collections" USING btree ("workspace_id") WHERE "collections"."parent_id" is null and "collections"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "entries_collection_rank_unique" ON "entries" USING btree ("workspace_id","collection_id","rank") WHERE "entries"."collection_id" is not null and "entries"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "entries_root_rank_unique" ON "entries" USING btree ("workspace_id","rank") WHERE "entries"."collection_id" is null and "entries"."deleted_at" is null;