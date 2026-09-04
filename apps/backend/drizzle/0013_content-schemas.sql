CREATE TYPE "public"."schema_migration_entry_status" AS ENUM('queued', 'processing', 'completed', 'failed', 'rolled_back');--> statement-breakpoint
CREATE TYPE "public"."schema_migration_status" AS ENUM('queued', 'running', 'rolling_back', 'completed', 'failed');--> statement-breakpoint
ALTER TYPE "public"."version_reason" ADD VALUE 'schema-migration';--> statement-breakpoint
CREATE TABLE "collection_schemas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"draft_state" "bytea",
	"draft_document" jsonb,
	"draft_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_schemas_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "collection_schemas_workspace_collection_unique" UNIQUE("workspace_id","collection_id")
);
--> statement-breakpoint
CREATE TABLE "effective_schema_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"definition" jsonb NOT NULL,
	"hash" varchar(64) NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "effective_schema_revisions_workspace_id_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE "schema_draft_contributors" (
	"workspace_id" uuid NOT NULL,
	"schema_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	CONSTRAINT "schema_draft_contributors_schema_id_membership_id_pk" PRIMARY KEY("schema_id","membership_id")
);
--> statement-breakpoint
CREATE TABLE "schema_migration_collections" (
	"workspace_id" uuid NOT NULL,
	"migration_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"source_revision_id" uuid,
	"target_revision_id" uuid,
	CONSTRAINT "schema_migration_collections_migration_id_collection_id_pk" PRIMARY KEY("migration_id","collection_id")
);
--> statement-breakpoint
CREATE TABLE "schema_migration_entries" (
	"workspace_id" uuid NOT NULL,
	"migration_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"source_revision_id" uuid,
	"target_revision_id" uuid,
	"source_hash" varchar(64),
	"target_hash" varchar(64),
	"recovery_version_id" uuid,
	"status" "schema_migration_entry_status" DEFAULT 'queued' NOT NULL,
	"content_lost" boolean DEFAULT false NOT NULL,
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "schema_migration_entries_migration_id_entry_id_pk" PRIMARY KEY("migration_id","entry_id")
);
--> statement-breakpoint
CREATE TABLE "schema_migrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"schema_id" uuid,
	"schema_version_id" uuid,
	"status" "schema_migration_status" DEFAULT 'queued' NOT NULL,
	"job_id" varchar(255),
	"initiated_by" uuid,
	"total_entries" integer DEFAULT 0 NOT NULL,
	"processed_entries" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schema_migrations_workspace_id_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE "schema_version_contributors" (
	"workspace_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	CONSTRAINT "schema_version_contributors_version_id_membership_id_pk" PRIMARY KEY("version_id","membership_id")
);
--> statement-breakpoint
CREATE TABLE "schema_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"schema_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"definition" jsonb NOT NULL,
	"hash" varchar(64) NOT NULL,
	"name" text,
	"reason" "version_reason" NOT NULL,
	"source_version_id" uuid,
	"active" boolean DEFAULT false NOT NULL,
	"applied_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schema_versions_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "schema_versions_schema_version_unique" UNIQUE("schema_id","version")
);
--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN "schema_revision_id" uuid;--> statement-breakpoint
ALTER TABLE "entry_versions" ADD COLUMN "schema_revision_id" uuid;--> statement-breakpoint
ALTER TABLE "collection_schemas" ADD CONSTRAINT "collection_schemas_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_schemas" ADD CONSTRAINT "collection_schemas_workspace_collection_fk" FOREIGN KEY ("workspace_id","collection_id") REFERENCES "public"."collections"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effective_schema_revisions" ADD CONSTRAINT "effective_schema_revisions_workspace_collection_fk" FOREIGN KEY ("workspace_id","collection_id") REFERENCES "public"."collections"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_draft_contributors" ADD CONSTRAINT "schema_draft_contributors_workspace_schema_fk" FOREIGN KEY ("workspace_id","schema_id") REFERENCES "public"."collection_schemas"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_draft_contributors" ADD CONSTRAINT "schema_draft_contributors_workspace_membership_fk" FOREIGN KEY ("workspace_id","membership_id") REFERENCES "public"."memberships"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_migration_collections" ADD CONSTRAINT "schema_migration_collections_source_revision_id_effective_schema_revisions_id_fk" FOREIGN KEY ("source_revision_id") REFERENCES "public"."effective_schema_revisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_migration_collections" ADD CONSTRAINT "schema_migration_collections_target_revision_id_effective_schema_revisions_id_fk" FOREIGN KEY ("target_revision_id") REFERENCES "public"."effective_schema_revisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_migration_collections" ADD CONSTRAINT "schema_migration_collections_workspace_migration_fk" FOREIGN KEY ("workspace_id","migration_id") REFERENCES "public"."schema_migrations"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_migration_collections" ADD CONSTRAINT "schema_migration_collections_workspace_collection_fk" FOREIGN KEY ("workspace_id","collection_id") REFERENCES "public"."collections"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_migration_entries" ADD CONSTRAINT "schema_migration_entries_source_revision_id_effective_schema_revisions_id_fk" FOREIGN KEY ("source_revision_id") REFERENCES "public"."effective_schema_revisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_migration_entries" ADD CONSTRAINT "schema_migration_entries_target_revision_id_effective_schema_revisions_id_fk" FOREIGN KEY ("target_revision_id") REFERENCES "public"."effective_schema_revisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_migration_entries" ADD CONSTRAINT "schema_migration_entries_workspace_migration_fk" FOREIGN KEY ("workspace_id","migration_id") REFERENCES "public"."schema_migrations"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_migration_entries" ADD CONSTRAINT "schema_migration_entries_workspace_entry_fk" FOREIGN KEY ("workspace_id","entry_id") REFERENCES "public"."entries"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_migrations" ADD CONSTRAINT "schema_migrations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_migrations" ADD CONSTRAINT "schema_migrations_schema_id_collection_schemas_id_fk" FOREIGN KEY ("schema_id") REFERENCES "public"."collection_schemas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_migrations" ADD CONSTRAINT "schema_migrations_schema_version_id_schema_versions_id_fk" FOREIGN KEY ("schema_version_id") REFERENCES "public"."schema_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_migrations" ADD CONSTRAINT "schema_migrations_initiated_by_memberships_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_version_contributors" ADD CONSTRAINT "schema_version_contributors_workspace_version_fk" FOREIGN KEY ("workspace_id","version_id") REFERENCES "public"."schema_versions"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_version_contributors" ADD CONSTRAINT "schema_version_contributors_workspace_membership_fk" FOREIGN KEY ("workspace_id","membership_id") REFERENCES "public"."memberships"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_versions" ADD CONSTRAINT "schema_versions_source_version_id_schema_versions_id_fk" FOREIGN KEY ("source_version_id") REFERENCES "public"."schema_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_versions" ADD CONSTRAINT "schema_versions_applied_by_memberships_id_fk" FOREIGN KEY ("applied_by") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_versions" ADD CONSTRAINT "schema_versions_workspace_schema_fk" FOREIGN KEY ("workspace_id","schema_id") REFERENCES "public"."collection_schemas"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "effective_schema_revisions_active_unique" ON "effective_schema_revisions" USING btree ("workspace_id","collection_id") WHERE "effective_schema_revisions"."active";--> statement-breakpoint
CREATE INDEX "effective_schema_revisions_workspace_collection_created_idx" ON "effective_schema_revisions" USING btree ("workspace_id","collection_id","created_at");--> statement-breakpoint
CREATE INDEX "schema_draft_contributors_workspace_membership_idx" ON "schema_draft_contributors" USING btree ("workspace_id","membership_id");--> statement-breakpoint
CREATE INDEX "schema_migration_collections_workspace_collection_idx" ON "schema_migration_collections" USING btree ("workspace_id","collection_id");--> statement-breakpoint
CREATE INDEX "schema_migration_entries_workspace_status_idx" ON "schema_migration_entries" USING btree ("workspace_id","migration_id","status");--> statement-breakpoint
CREATE INDEX "schema_migration_entries_workspace_loss_idx" ON "schema_migration_entries" USING btree ("workspace_id","migration_id","content_lost") WHERE "schema_migration_entries"."content_lost";--> statement-breakpoint
CREATE UNIQUE INDEX "schema_migrations_job_unique" ON "schema_migrations" USING btree ("job_id") WHERE "schema_migrations"."job_id" is not null;--> statement-breakpoint
CREATE INDEX "schema_migrations_workspace_status_created_idx" ON "schema_migrations" USING btree ("workspace_id","status","created_at");--> statement-breakpoint
CREATE INDEX "schema_version_contributors_workspace_membership_idx" ON "schema_version_contributors" USING btree ("workspace_id","membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "schema_versions_active_unique" ON "schema_versions" USING btree ("schema_id") WHERE "schema_versions"."active";--> statement-breakpoint
CREATE INDEX "schema_versions_workspace_schema_created_idx" ON "schema_versions" USING btree ("workspace_id","schema_id","created_at");--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_schema_revision_id_effective_schema_revisions_id_fk" FOREIGN KEY ("schema_revision_id") REFERENCES "public"."effective_schema_revisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_versions" ADD CONSTRAINT "entry_versions_schema_revision_id_effective_schema_revisions_id_fk" FOREIGN KEY ("schema_revision_id") REFERENCES "public"."effective_schema_revisions"("id") ON DELETE set null ON UPDATE no action;