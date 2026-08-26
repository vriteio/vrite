ALTER TYPE "public"."key_permission" ADD VALUE 'publishing' BEFORE 'collections';--> statement-breakpoint
ALTER TYPE "public"."key_permission" ADD VALUE 'read:publishing' BEFORE 'collections';--> statement-breakpoint
ALTER TYPE "public"."permission" RENAME TO "permission_old";--> statement-breakpoint
CREATE TYPE "public"."permission" AS ENUM('content', 'versions', 'read:versions', 'publishing', 'read:publishing', 'api_keys', 'read:api_keys', 'billing', 'read:billing', 'workspace');--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "permissions" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "permissions" TYPE "public"."permission"[] USING "permissions"::text[]::"public"."permission"[];--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "permissions" SET DEFAULT '{}';--> statement-breakpoint
DROP TYPE "public"."permission_old";--> statement-breakpoint
CREATE TABLE "entry_publications" (
	"workspace_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entry_publications_entry_id_channel_id_pk" PRIMARY KEY("entry_id","channel_id")
);
--> statement-breakpoint
CREATE TABLE "publishing_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"code" varchar(50) NOT NULL,
	"built_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publishing_channels_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "publishing_channels_workspace_code_unique" UNIQUE("workspace_id","code"),
	CONSTRAINT "publishing_channels_code_not_empty" CHECK (length("publishing_channels"."code") > 0),
	CONSTRAINT "publishing_channels_built_in_code" CHECK (not "publishing_channels"."built_in" or "publishing_channels"."code" = 'published')
);
--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "publishing_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "entry_versions" ADD CONSTRAINT "entry_versions_workspace_entry_id_unique" UNIQUE("workspace_id","entry_id","id");--> statement-breakpoint
ALTER TABLE "entry_publications" ADD CONSTRAINT "entry_publications_workspace_entry_fk" FOREIGN KEY ("workspace_id","entry_id") REFERENCES "public"."entries"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_publications" ADD CONSTRAINT "entry_publications_workspace_channel_fk" FOREIGN KEY ("workspace_id","channel_id") REFERENCES "public"."publishing_channels"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_publications" ADD CONSTRAINT "entry_publications_workspace_entry_version_fk" FOREIGN KEY ("workspace_id","entry_id","version_id") REFERENCES "public"."entry_versions"("workspace_id","entry_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_channels" ADD CONSTRAINT "publishing_channels_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entry_publications_workspace_channel_idx" ON "entry_publications" USING btree ("workspace_id","channel_id");--> statement-breakpoint
CREATE INDEX "entry_publications_version_id_idx" ON "entry_publications" USING btree ("version_id");--> statement-breakpoint
INSERT INTO "publishing_channels" ("workspace_id", "name", "code", "built_in")
SELECT "id", 'Published', 'published', true FROM "workspaces";--> statement-breakpoint
UPDATE "roles"
SET "permissions" = array_append("permissions", 'publishing'::"public"."permission")
WHERE 'content'::"public"."permission" = ANY("permissions")
  AND NOT ('publishing'::"public"."permission" = ANY("permissions"));--> statement-breakpoint
UPDATE "roles"
SET "permissions" = array_append("permissions", 'read:publishing'::"public"."permission")
WHERE "base_role" = 'viewer'
  AND NOT ('publishing'::"public"."permission" = ANY("permissions"))
  AND NOT ('read:publishing'::"public"."permission" = ANY("permissions"));
