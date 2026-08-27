import { toCollectionID, toEntryID, toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { entries, type Collection, type Entry } from "#backend/db";
import { getPublishingStatusSnapshot, PUBLISHED_CHANNEL_CODE } from "#backend/lib/publishing";
import { loadRestrictedCollectionAccess, type SessionData } from "#backend/lib/policy";
import { and, desc, eq, isNull } from "drizzle-orm";

const getExplorerTree = async (input: {
  auth: SessionData;
  workspaceID: string;
  includePublishing: boolean;
}): Promise<{
  collections: Collection[];
  entries: Entry[];
  publishing: { enabledCollectionIDs: string[]; unpublishedEntryIDs: string[] } | null;
}> => {
  const workspaceID = toUUID(input.workspaceID);
  const [access, entryRows, publishing] = await Promise.all([
    loadRestrictedCollectionAccess(input.auth),
    db
      .select()
      .from(entries)
      .where(and(eq(entries.workspaceID, workspaceID), isNull(entries.deletedAt)))
      .orderBy(desc(entries.rank)),
    input.includePublishing
      ? getPublishingStatusSnapshot({
          workspaceID,
          channel: PUBLISHED_CHANNEL_CODE
        })
      : null
  ]);
  const entryRowsByID = new Map(entryRows.map((entry) => [toEntryID(entry.id), entry]));

  return {
    collections: access.collections,
    entries: entryRows
      .filter((entry) => {
        const collectionID = entry.collectionID ? toCollectionID(entry.collectionID) : null;

        return !collectionID || access.collectionIDs.has(collectionID);
      })
      .map((entry) => ({
        id: toEntryID(entry.id),
        name: entry.name,
        order: entry.rank,
        collectionID: entry.collectionID ? toCollectionID(entry.collectionID) : undefined
      })),
    publishing: publishing
      ? {
          enabledCollectionIDs: publishing.enabledCollectionIDs.filter((collectionID) => {
            return access.collectionIDs.has(collectionID);
          }),
          unpublishedEntryIDs: publishing.entries
            .filter(({ entryID, hasUnpublishedChanges }) => {
              const entry = entryRowsByID.get(entryID);
              const collectionID = entry?.collectionID ? toCollectionID(entry.collectionID) : null;

              return (
                hasUnpublishedChanges && (!collectionID || access.collectionIDs.has(collectionID))
              );
            })
            .map(({ entryID }) => entryID)
        }
      : null
  };
};

export { getExplorerTree };
