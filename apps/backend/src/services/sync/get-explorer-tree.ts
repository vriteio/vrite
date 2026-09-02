import { entries, type Collection, type Entry } from "#backend/db";
import { type CollectionAccess, withAuthorization } from "#backend/lib/policy";
import { toCollectionID, toEntryID } from "#backend/lib/primitives";
import { getPublishingStatusSnapshot, PUBLISHED_CHANNEL_CODE } from "#backend/lib/publishing";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, isNull } from "drizzle-orm";

interface GetExplorerTreeInput {
  includePublishing: boolean;
}
interface ExplorerTree {
  collections: Collection[];
  entries: Entry[];
  accessByCollectionID: Record<string, CollectionAccess>;
  workspaceContentAccess: CollectionAccess;
  topLevelCollectionIDs: string[];
  publishing: { enabledCollectionIDs: string[]; unpublishedEntryIDs: string[] } | null;
}

const getExplorerTree = withAuthorization<GetExplorerTreeInput, undefined, ExplorerTree>(
  { tree: true },
  async ({ authorization, database, input, workspaceID }) => {
    const [entryRows, publishing] = await Promise.all([
      database
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
    const rootCollection = authorization.collections.find(({ id }) => {
      return id === authorization.rootID;
    });
    const workspaceContentAccess = authorization.getAccess();

    if (!rootCollection || !workspaceContentAccess) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Workspace content tree is unavailable"
      });
    }

    return {
      collections: authorization.collections.filter(({ id }) => id !== authorization.rootID),
      accessByCollectionID: authorization.toAccessRecord(),
      workspaceContentAccess,
      topLevelCollectionIDs: rootCollection.descendants,
      entries: entryRows
        .filter((entry) => {
          const collectionID = entry.collectionID ? toCollectionID(entry.collectionID) : null;

          return authorization.canAccessCollection(collectionID);
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
              return (
                collectionID !== authorization.rootID &&
                authorization.canAccessCollection(collectionID)
              );
            }),
            unpublishedEntryIDs: publishing.entries
              .filter(({ entryID, hasUnpublishedChanges }) => {
                const entry = entryRowsByID.get(entryID);
                const collectionID = entry?.collectionID
                  ? toCollectionID(entry.collectionID)
                  : null;

                return hasUnpublishedChanges && authorization.canAccessCollection(collectionID);
              })
              .map(({ entryID }) => entryID)
          }
        : null
    };
  }
);

export { getExplorerTree };
