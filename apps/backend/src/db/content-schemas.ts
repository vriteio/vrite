import type { SchemaDefinition } from "#backend/lib/schema/contract";
import type { ResolvedSchemaDefinition } from "#backend/lib/schema/inheritance";
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { collections } from "./collections";
import { entries } from "./entries";
import { memberships } from "./memberships";
import { bytea, timestamps, versionReasonEnum } from "./shared";
import { workspaces } from "./workspaces";

interface SchemaEntryMove {
  entryID: string;
  sourceCollectionID: string | null;
  sourceOrder: string;
  unpublishOnCompletion?: boolean;
}
interface SchemaCollectionMove {
  collectionID: string;
  sourceParentID: string;
  sourceOrder: string;
  entryIDs: string[];
  unpublishEntryIDs: string[];
}

const schemaMigrationStatusEnum = pgEnum("schema_migration_status", [
  "queued",
  "running",
  "rolling_back",
  "completed",
  "failed"
]);
const schemaMigrationEntryStatusEnum = pgEnum("schema_migration_entry_status", [
  "queued",
  "processing",
  "completed",
  "failed",
  "rolled_back"
]);
const collectionSchemas = pgTable(
  "collection_schemas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceID: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    collectionID: uuid("collection_id").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    draftState: bytea("draft_state"),
    draftDocument: jsonb("draft_document").$type<SchemaDefinition>(),
    draftHash: varchar("draft_hash", { length: 64 }),
    ...timestamps
  },
  (table) => [
    unique("collection_schemas_workspace_id_id_unique").on(table.workspaceID, table.id),
    unique("collection_schemas_workspace_collection_unique").on(
      table.workspaceID,
      table.collectionID
    ),
    foreignKey({
      name: "collection_schemas_workspace_collection_fk",
      columns: [table.workspaceID, table.collectionID],
      foreignColumns: [collections.workspaceID, collections.id]
    }).onDelete("cascade")
  ]
);
const schemaVersions = pgTable(
  "schema_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceID: uuid("workspace_id").notNull(),
    schemaID: uuid("schema_id").notNull(),
    version: integer("version").notNull(),
    definition: jsonb("definition").$type<SchemaDefinition>().notNull(),
    hash: varchar("hash", { length: 64 }).notNull(),
    name: text("name"),
    reason: versionReasonEnum("reason").notNull(),
    sourceVersionID: uuid("source_version_id").references((): AnyPgColumn => schemaVersions.id, {
      onDelete: "set null"
    }),
    active: boolean("active").notNull().default(false),
    appliedBy: uuid("applied_by").references(() => memberships.id, { onDelete: "set null" }),
    ...timestamps
  },
  (table) => [
    unique("schema_versions_workspace_id_id_unique").on(table.workspaceID, table.id),
    unique("schema_versions_schema_version_unique").on(table.schemaID, table.version),
    uniqueIndex("schema_versions_active_unique")
      .on(table.schemaID)
      .where(sql`${table.active}`),
    foreignKey({
      name: "schema_versions_workspace_schema_fk",
      columns: [table.workspaceID, table.schemaID],
      foreignColumns: [collectionSchemas.workspaceID, collectionSchemas.id]
    }).onDelete("cascade"),
    index("schema_versions_workspace_schema_created_idx").on(
      table.workspaceID,
      table.schemaID,
      table.createdAt
    )
  ]
);
const schemaVersionContributors = pgTable(
  "schema_version_contributors",
  {
    workspaceID: uuid("workspace_id").notNull(),
    versionID: uuid("version_id").notNull(),
    membershipID: uuid("membership_id").notNull()
  },
  (table) => [
    primaryKey({ columns: [table.versionID, table.membershipID] }),
    foreignKey({
      name: "schema_version_contributors_workspace_version_fk",
      columns: [table.workspaceID, table.versionID],
      foreignColumns: [schemaVersions.workspaceID, schemaVersions.id]
    }).onDelete("cascade"),
    foreignKey({
      name: "schema_version_contributors_workspace_membership_fk",
      columns: [table.workspaceID, table.membershipID],
      foreignColumns: [memberships.workspaceID, memberships.id]
    }).onDelete("cascade"),
    index("schema_version_contributors_workspace_membership_idx").on(
      table.workspaceID,
      table.membershipID
    )
  ]
);
const schemaDraftContributors = pgTable(
  "schema_draft_contributors",
  {
    workspaceID: uuid("workspace_id").notNull(),
    schemaID: uuid("schema_id").notNull(),
    membershipID: uuid("membership_id").notNull()
  },
  (table) => [
    primaryKey({ columns: [table.schemaID, table.membershipID] }),
    foreignKey({
      name: "schema_draft_contributors_workspace_schema_fk",
      columns: [table.workspaceID, table.schemaID],
      foreignColumns: [collectionSchemas.workspaceID, collectionSchemas.id]
    }).onDelete("cascade"),
    foreignKey({
      name: "schema_draft_contributors_workspace_membership_fk",
      columns: [table.workspaceID, table.membershipID],
      foreignColumns: [memberships.workspaceID, memberships.id]
    }).onDelete("cascade"),
    index("schema_draft_contributors_workspace_membership_idx").on(
      table.workspaceID,
      table.membershipID
    )
  ]
);
const effectiveSchemaRevisions = pgTable(
  "effective_schema_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceID: uuid("workspace_id").notNull(),
    collectionID: uuid("collection_id").notNull(),
    definition: jsonb("definition").$type<ResolvedSchemaDefinition>().notNull(),
    hash: varchar("hash", { length: 64 }).notNull(),
    active: boolean("active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    unique("effective_schema_revisions_workspace_id_id_unique").on(table.workspaceID, table.id),
    uniqueIndex("effective_schema_revisions_active_unique")
      .on(table.workspaceID, table.collectionID)
      .where(sql`${table.active}`),
    foreignKey({
      name: "effective_schema_revisions_workspace_collection_fk",
      columns: [table.workspaceID, table.collectionID],
      foreignColumns: [collections.workspaceID, collections.id]
    }).onDelete("cascade"),
    index("effective_schema_revisions_workspace_collection_created_idx").on(
      table.workspaceID,
      table.collectionID,
      table.createdAt
    )
  ]
);
const schemaMigrations = pgTable(
  "schema_migrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceID: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    schemaID: uuid("schema_id").references(() => collectionSchemas.id, { onDelete: "set null" }),
    schemaVersionID: uuid("schema_version_id").references(() => schemaVersions.id, {
      onDelete: "set null"
    }),
    status: schemaMigrationStatusEnum("status").notNull().default("queued"),
    jobID: varchar("job_id", { length: 255 }),
    entryMove: jsonb("entry_move").$type<SchemaEntryMove>(),
    collectionMove: jsonb("collection_move").$type<SchemaCollectionMove>(),
    initiatedBy: uuid("initiated_by").references(() => memberships.id, {
      onDelete: "set null"
    }),
    totalEntries: integer("total_entries").notNull().default(0),
    processedEntries: integer("processed_entries").notNull().default(0),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [
    unique("schema_migrations_workspace_id_id_unique").on(table.workspaceID, table.id),
    uniqueIndex("schema_migrations_job_unique")
      .on(table.jobID)
      .where(sql`${table.jobID} is not null`),
    index("schema_migrations_workspace_status_created_idx").on(
      table.workspaceID,
      table.status,
      table.createdAt
    )
  ]
);
const schemaMigrationCollections = pgTable(
  "schema_migration_collections",
  {
    workspaceID: uuid("workspace_id").notNull(),
    migrationID: uuid("migration_id").notNull(),
    collectionID: uuid("collection_id").notNull(),
    sourceRevisionID: uuid("source_revision_id").references(() => effectiveSchemaRevisions.id, {
      onDelete: "set null"
    }),
    targetRevisionID: uuid("target_revision_id").references(() => effectiveSchemaRevisions.id, {
      onDelete: "set null"
    })
  },
  (table) => [
    primaryKey({ columns: [table.migrationID, table.collectionID] }),
    foreignKey({
      name: "schema_migration_collections_workspace_migration_fk",
      columns: [table.workspaceID, table.migrationID],
      foreignColumns: [schemaMigrations.workspaceID, schemaMigrations.id]
    }).onDelete("cascade"),
    foreignKey({
      name: "schema_migration_collections_workspace_collection_fk",
      columns: [table.workspaceID, table.collectionID],
      foreignColumns: [collections.workspaceID, collections.id]
    }).onDelete("cascade"),
    index("schema_migration_collections_workspace_collection_idx").on(
      table.workspaceID,
      table.collectionID
    )
  ]
);
const schemaMigrationEntries = pgTable(
  "schema_migration_entries",
  {
    workspaceID: uuid("workspace_id").notNull(),
    migrationID: uuid("migration_id").notNull(),
    entryID: uuid("entry_id").notNull(),
    sourceRevisionID: uuid("source_revision_id").references(() => effectiveSchemaRevisions.id, {
      onDelete: "set null"
    }),
    targetRevisionID: uuid("target_revision_id").references(() => effectiveSchemaRevisions.id, {
      onDelete: "set null"
    }),
    sourceHash: varchar("source_hash", { length: 64 }),
    targetHash: varchar("target_hash", { length: 64 }),
    recoveryVersionID: uuid("recovery_version_id"),
    status: schemaMigrationEntryStatusEnum("status").notNull().default("queued"),
    contentLost: boolean("content_lost").notNull().default(false),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true })
  },
  (table) => [
    primaryKey({ columns: [table.migrationID, table.entryID] }),
    foreignKey({
      name: "schema_migration_entries_workspace_migration_fk",
      columns: [table.workspaceID, table.migrationID],
      foreignColumns: [schemaMigrations.workspaceID, schemaMigrations.id]
    }).onDelete("cascade"),
    foreignKey({
      name: "schema_migration_entries_workspace_entry_fk",
      columns: [table.workspaceID, table.entryID],
      foreignColumns: [entries.workspaceID, entries.id]
    }).onDelete("cascade"),
    index("schema_migration_entries_workspace_status_idx").on(
      table.workspaceID,
      table.migrationID,
      table.status
    ),
    index("schema_migration_entries_workspace_loss_idx")
      .on(table.workspaceID, table.migrationID, table.contentLost)
      .where(sql`${table.contentLost}`)
  ]
);

export {
  collectionSchemas,
  effectiveSchemaRevisions,
  schemaDraftContributors,
  schemaMigrationCollections,
  schemaMigrationEntries,
  schemaMigrationEntryStatusEnum,
  schemaMigrations,
  schemaMigrationStatusEnum,
  schemaVersionContributors,
  schemaVersions
};
