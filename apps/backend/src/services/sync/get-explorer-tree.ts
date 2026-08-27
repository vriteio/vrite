import { toCollectionID, toEntryID, toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { entries, permissionType, type Collection, type Entry, type Permission } from "#backend/db";
import { getPublishingStatusSnapshot, PUBLISHED_CHANNEL_CODE } from "#backend/lib/publishing";
import {
  hasCollectionPermission,
  loadRestrictedCollectionAccess,
  type SessionData
} from "#backend/lib/policy";
import { and, desc, eq, isNull } from "drizzle-orm";

const getExplorerTree = async (input: {
  auth: SessionData;
  workspaceID: string;
  includePublishing: boolean;
}): Promise<{
  collections: Collection[];
  entries: Entry[];
  permissionsByCollectionID: Record<string, Permission[]>;
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
  const canReadPublishing = access.collections.some((collection) => {
    return hasCollectionPermission(input.auth, access, collection.id, "read:publishing");
  });

  return {
    collections: access.collections,
    permissionsByCollectionID: Object.fromEntries(
      access.collections.map((collection) => [
        collection.id,
        permissionType.options.filter((permission) => {
          return hasCollectionPermission(input.auth, access, collection.id, permission);
        })
      ])
    ),
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
    publishing:
      publishing && canReadPublishing
        ? {
            enabledCollectionIDs: publishing.enabledCollectionIDs.filter((collectionID) => {
              return hasCollectionPermission(input.auth, access, collectionID, "read:publishing");
            }),
            unpublishedEntryIDs: publishing.entries
              .filter(({ entryID, hasUnpublishedChanges }) => {
                const entry = entryRowsByID.get(entryID);
                const collectionID = entry?.collectionID
                  ? toCollectionID(entry.collectionID)
                  : null;

                return (
                  hasUnpublishedChanges &&
                  hasCollectionPermission(input.auth, access, collectionID, "read:publishing")
                );
              })
              .map(({ entryID }) => entryID)
          }
        : null
  };
};

export { getExplorerTree };
