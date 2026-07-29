import { toCollectionID, toEntryID, toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { entries, type Collection, type Entry } from "#backend/db";
import { loadCollectionTree } from "#backend/services/collections/queries";
import { desc, eq } from "drizzle-orm";

const getExplorerTree = async (input: {
  workspaceID: string;
}): Promise<{ collections: Collection[]; entries: Entry[] }> => {
  const workspaceID = toUUID(input.workspaceID);
  const [tree, entryRows] = await Promise.all([
    loadCollectionTree(workspaceID),
    db
      .select()
      .from(entries)
      .where(eq(entries.workspaceID, workspaceID))
      .orderBy(desc(entries.rank))
  ]);

  return {
    collections: tree.collections,
    entries: entryRows.map((entry) => ({
      id: toEntryID(entry.id),
      name: entry.name,
      order: entry.rank,
      collectionID: entry.collectionID ? toCollectionID(entry.collectionID) : undefined
    }))
  };
};

export { getExplorerTree };
