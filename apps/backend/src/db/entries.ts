import { id } from "#backend/lib/id";
import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import * as z from "zod";
import { timestamps } from "./shared";
import { collections } from "./collections";
import { workspaces } from "./workspaces";

const entryType = z.object({
  id: id().describe("ID of the entry"),
  name: z.string().describe("Name of the entry"),
  order: z.string().describe("LexoRank order of the entry"),
  collectionID: id().optional().describe("ID of the collection this entry belongs to")
});

const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceID: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    collectionID: uuid("collection_id"),
    name: text("name").notNull(),
    rank: varchar("rank", { length: 255 }).notNull(),
    ...timestamps
  },
  (table) => [
    unique("entries_workspace_id_id_unique").on(table.workspaceID, table.id),
    foreignKey({
      name: "entries_workspace_collection_fk",
      columns: [table.workspaceID, table.collectionID],
      foreignColumns: [collections.workspaceID, collections.id]
    }).onDelete("cascade"),
    uniqueIndex("entries_collection_rank_unique")
      .on(table.workspaceID, table.collectionID, table.rank)
      .where(sql`${table.collectionID} is not null`),
    uniqueIndex("entries_root_rank_unique")
      .on(table.workspaceID, table.rank)
      .where(sql`${table.collectionID} is null`),
    index("entries_workspace_collection_rank_idx").on(
      table.workspaceID,
      table.collectionID,
      table.rank
    )
  ]
);

type Entry = z.infer<typeof entryType>;

export { entries, entryType };
export type { Entry };
