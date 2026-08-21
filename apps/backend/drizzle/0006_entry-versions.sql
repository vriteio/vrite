CREATE TYPE "public"."version_reason" AS ENUM('auto', 'manual', 'revert');--> statement-breakpoint
CREATE TABLE "entry_version_contributors" (
	"workspace_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	CONSTRAINT "entry_version_contributors_version_id_membership_id_pk" PRIMARY KEY("version_id","membership_id")
);
--> statement-breakpoint
CREATE TABLE "entry_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"entry_name" text NOT NULL,
	"document" jsonb NOT NULL,
	"hash" varchar(64) NOT NULL,
	"name" text,
	"reason" "version_reason" NOT NULL,
	"source_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entry_versions_workspace_id_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
ALTER TABLE "entry_version_contributors" ADD CONSTRAINT "entry_version_contributors_workspace_version_fk" FOREIGN KEY ("workspace_id","version_id") REFERENCES "public"."entry_versions"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_version_contributors" ADD CONSTRAINT "entry_version_contributors_workspace_membership_fk" FOREIGN KEY ("workspace_id","membership_id") REFERENCES "public"."memberships"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_versions" ADD CONSTRAINT "entry_versions_source_version_id_entry_versions_id_fk" FOREIGN KEY ("source_version_id") REFERENCES "public"."entry_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_versions" ADD CONSTRAINT "entry_versions_workspace_entry_fk" FOREIGN KEY ("workspace_id","entry_id") REFERENCES "public"."entries"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entry_version_contributors_workspace_membership_idx" ON "entry_version_contributors" USING btree ("workspace_id","membership_id");--> statement-breakpoint
CREATE INDEX "entry_versions_workspace_entry_created_idx" ON "entry_versions" USING btree ("workspace_id","entry_id","created_at");--> statement-breakpoint
CREATE INDEX "entry_versions_workspace_entry_hash_idx" ON "entry_versions" USING btree ("workspace_id","entry_id","hash");
