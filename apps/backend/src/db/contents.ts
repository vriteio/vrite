import type { ContentNode } from "#backend/lib/content";
import { foreignKey, index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { entries } from "./entries";
import { bytea } from "./shared";

const contents = pgTable(
  "contents",
  {
    entryID: uuid("entry_id").primaryKey(),
    workspaceID: uuid("workspace_id").notNull(),
    state: bytea("state"),
    document: jsonb("document").$type<ContentNode>(),
    hash: varchar("hash", { length: 64 }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    foreignKey({
      name: "contents_workspace_entry_fk",
      columns: [table.workspaceID, table.entryID],
      foreignColumns: [entries.workspaceID, entries.id]
    }).onDelete("cascade"),
    index("contents_workspace_id_idx").on(table.workspaceID)
  ]
);

export { contents };
