import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  primaryKey,
  unique,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { entries } from "./entries";
import { timestamps } from "./shared";
import { entryVersions } from "./versions";
import { workspaces } from "./workspaces";

const publishingChannels = pgTable(
  "publishing_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceID: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    builtIn: boolean("built_in").notNull().default(false),
    ...timestamps
  },
  (table) => [
    unique("publishing_channels_workspace_id_id_unique").on(table.workspaceID, table.id),
    unique("publishing_channels_workspace_code_unique").on(table.workspaceID, table.code),
    check("publishing_channels_code_not_empty", sql`length(${table.code}) > 0`),
    check(
      "publishing_channels_built_in_code",
      sql`not ${table.builtIn} or ${table.code} = 'published'`
    )
  ]
);
const entryPublications = pgTable(
  "entry_publications",
  {
    workspaceID: uuid("workspace_id").notNull(),
    entryID: uuid("entry_id").notNull(),
    channelID: uuid("channel_id").notNull(),
    versionID: uuid("version_id").notNull(),
    ...timestamps
  },
  (table) => [
    primaryKey({ columns: [table.entryID, table.channelID] }),
    foreignKey({
      name: "entry_publications_workspace_entry_fk",
      columns: [table.workspaceID, table.entryID],
      foreignColumns: [entries.workspaceID, entries.id]
    }).onDelete("cascade"),
    foreignKey({
      name: "entry_publications_workspace_channel_fk",
      columns: [table.workspaceID, table.channelID],
      foreignColumns: [publishingChannels.workspaceID, publishingChannels.id]
    }).onDelete("cascade"),
    foreignKey({
      name: "entry_publications_workspace_entry_version_fk",
      columns: [table.workspaceID, table.entryID, table.versionID],
      foreignColumns: [entryVersions.workspaceID, entryVersions.entryID, entryVersions.id]
    }).onDelete("restrict"),
    index("entry_publications_workspace_channel_idx").on(table.workspaceID, table.channelID),
    index("entry_publications_version_id_idx").on(table.versionID)
  ]
);

export { entryPublications, publishingChannels };
