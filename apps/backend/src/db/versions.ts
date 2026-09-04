import type { ContentNode } from "#backend/lib/content";
import {
  type AnyPgColumn,
  foreignKey,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { entries } from "./entries";
import { effectiveSchemaRevisions } from "./content-schemas";
import { memberships } from "./memberships";
import { timestamps, versionReasonEnum } from "./shared";
const entryVersions = pgTable(
  "entry_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceID: uuid("workspace_id").notNull(),
    entryID: uuid("entry_id").notNull(),
    entryName: text("entry_name").notNull(),
    document: jsonb("document").$type<ContentNode>().notNull(),
    hash: varchar("hash", { length: 64 }).notNull(),
    schemaRevisionID: uuid("schema_revision_id").references(() => effectiveSchemaRevisions.id, {
      onDelete: "set null"
    }),
    name: text("name"),
    reason: versionReasonEnum("reason").notNull(),
    sourceVersionID: uuid("source_version_id").references((): AnyPgColumn => entryVersions.id, {
      onDelete: "set null"
    }),
    ...timestamps
  },
  (table) => [
    unique("entry_versions_workspace_id_id_unique").on(table.workspaceID, table.id),
    unique("entry_versions_workspace_entry_id_unique").on(
      table.workspaceID,
      table.entryID,
      table.id
    ),
    foreignKey({
      name: "entry_versions_workspace_entry_fk",
      columns: [table.workspaceID, table.entryID],
      foreignColumns: [entries.workspaceID, entries.id]
    }).onDelete("cascade"),
    index("entry_versions_workspace_entry_created_idx").on(
      table.workspaceID,
      table.entryID,
      table.createdAt
    ),
    index("entry_versions_workspace_entry_hash_idx").on(
      table.workspaceID,
      table.entryID,
      table.hash
    )
  ]
);
const entryVersionContributors = pgTable(
  "entry_version_contributors",
  {
    workspaceID: uuid("workspace_id").notNull(),
    versionID: uuid("version_id").notNull(),
    membershipID: uuid("membership_id").notNull()
  },
  (table) => [
    primaryKey({ columns: [table.versionID, table.membershipID] }),
    foreignKey({
      name: "entry_version_contributors_workspace_version_fk",
      columns: [table.workspaceID, table.versionID],
      foreignColumns: [entryVersions.workspaceID, entryVersions.id]
    }).onDelete("cascade"),
    foreignKey({
      name: "entry_version_contributors_workspace_membership_fk",
      columns: [table.workspaceID, table.membershipID],
      foreignColumns: [memberships.workspaceID, memberships.id]
    }).onDelete("cascade"),
    index("entry_version_contributors_workspace_membership_idx").on(
      table.workspaceID,
      table.membershipID
    )
  ]
);
const entryVersionActivity = pgTable(
  "entry_version_activity",
  {
    entryID: uuid("entry_id").primaryKey(),
    workspaceID: uuid("workspace_id").notNull(),
    firstChangedAt: timestamp("first_changed_at", { withTimezone: true }).notNull().defaultNow(),
    lastChangedAt: timestamp("last_changed_at", { withTimezone: true }).notNull().defaultNow(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull()
  },
  (table) => [
    unique("entry_version_activity_workspace_entry_unique").on(table.workspaceID, table.entryID),
    foreignKey({
      name: "entry_version_activity_workspace_entry_fk",
      columns: [table.workspaceID, table.entryID],
      foreignColumns: [entries.workspaceID, entries.id]
    }).onDelete("cascade"),
    index("entry_version_activity_due_at_idx").on(table.dueAt)
  ]
);
const entryVersionActivityContributors = pgTable(
  "entry_version_activity_contributors",
  {
    workspaceID: uuid("workspace_id").notNull(),
    entryID: uuid("entry_id").notNull(),
    membershipID: uuid("membership_id").notNull()
  },
  (table) => [
    primaryKey({ columns: [table.entryID, table.membershipID] }),
    foreignKey({
      name: "entry_version_activity_contributors_workspace_entry_fk",
      columns: [table.workspaceID, table.entryID],
      foreignColumns: [entryVersionActivity.workspaceID, entryVersionActivity.entryID]
    }).onDelete("cascade"),
    foreignKey({
      name: "entry_version_activity_contributors_workspace_membership_fk",
      columns: [table.workspaceID, table.membershipID],
      foreignColumns: [memberships.workspaceID, memberships.id]
    }).onDelete("cascade"),
    index("entry_version_activity_contributors_workspace_membership_idx").on(
      table.workspaceID,
      table.membershipID
    )
  ]
);

export {
  entryVersionActivity,
  entryVersionActivityContributors,
  entryVersionContributors,
  entryVersions,
  versionReasonEnum
};
