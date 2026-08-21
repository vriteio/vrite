import { toCollectionID, toEntryID, toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { entries, type Collection, type Entry } from "#backend/db";
import { loadCollectionTree } from "#backend/lib/data";
import { getPublishingStatusSnapshot, PUBLISHED_CHANNEL_NAME } from "#backend/lib/publishing";
import { and, desc, eq, isNull } from "drizzle-orm";

const getExplorerTree = async (input: {
  workspaceID: string;
  includePublishing: boolean;
}): Promise<{
  collections: Collection[];
  entries: Entry[];
  publishing: { enabledCollectionIDs: string[]; unpublishedEntryIDs: string[] } | null;
}> => {
  const workspaceID = toUUID(input.workspaceID);
  const [tree, entryRows, publishing] = await Promise.all([
    loadCollectionTree(workspaceID),
    db
      .select()
      .from(entries)
      .where(and(eq(entries.workspaceID, workspaceID), isNull(entries.deletedAt)))
      .orderBy(desc(entries.rank)),
    input.includePublishing
      ? getPublishingStatusSnapshot({
          workspaceID,
          channel: PUBLISHED_CHANNEL_NAME
        })
      : null
  ]);

  return {
    collections: tree.collections,
    entries: entryRows.map((entry) => ({
      id: toEntryID(entry.id),
      name: entry.name,
      order: entry.rank,
      collectionID: entry.collectionID ? toCollectionID(entry.collectionID) : undefined
    })),
    publishing: publishing
      ? {
          enabledCollectionIDs: publishing.enabledCollectionIDs,
          unpublishedEntryIDs: publishing.entries
            .filter(({ hasUnpublishedChanges }) => hasUnpublishedChanges)
            .map(({ entryID }) => entryID)
        }
      : null
  };
};

export { getExplorerTree };
