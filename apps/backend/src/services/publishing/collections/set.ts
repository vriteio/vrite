import { collections, entryPublications } from "#backend/db";
import {
  getDisabledEntryIDs,
  getSubtreeEntryIDs,
  isCollectionPublishingEnabled,
  loadPublishingTree,
  lockPublishingEntries,
  PUBLISHED_CHANNEL_CODE,
  publishEntries,
  syncEntrySnapshots
} from "#backend/lib/publishing";
import { toCollectionID, toEntryID, toUUID } from "#backend/lib/primitives";
import type { VersionSummary } from "#backend/lib/data";
import type { PublishingEntryStatus } from "#backend/lib/publishing";
import { ORPCError } from "@orpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { filterAuthorizedEntryIDs, withAuthorization } from "#backend/lib/policy";

interface SetCollectionPublishingResult {
  changed: boolean;
  collectionID: string;
  createdVersions: VersionSummary[];
  publishingEntries: PublishingEntryStatus[];
  publishedEntries: number;
}
interface SetCollectionsPublishingInput {
  collectionIDs: string[];
  enabled: boolean;
  publish?: boolean;
  contributorIDs: string[];
}

const getCollectionDepth = (
  collectionParents: Map<string, string | null>,
  collectionID: string
): number => {
  let depth = 0;
  let parentID = collectionParents.get(collectionID);

  while (parentID) {
    depth += 1;
    parentID = collectionParents.get(parentID);
  }

  return depth;
};
const setCollectionsPublishing = withAuthorization<
  SetCollectionsPublishingInput,
  undefined,
  SetCollectionPublishingResult[]
>(
  {
    actions: ({ input }) => ({
      collections: input.collectionIDs.map((collectionID) => ({
        action: "collection:set-publishing",
        collectionID
      }))
    }),
    tree: true,
    transaction: "locked-workspace"
  },
  async ({ authorization, database, input, workspaceID }) => {
    const collectionIDs = [...new Set(input.collectionIDs.map(toUUID))];

    if (input.enabled && input.publish) {
      const entryIDs = await (async () => {
        const tree = await loadPublishingTree(database, workspaceID);
        const collectionsByID = new Map(
          tree.collections.map((collection) => [collection.id, collection])
        );
        const selectedCollections = collectionIDs.map((collectionID) => {
          return collectionsByID.get(collectionID);
        });

        if (selectedCollections.some((collection) => !collection)) {
          throw new ORPCError("NOT_FOUND", { message: "Collection not found" });
        }

        if (selectedCollections.some((collection) => collection?.parentID === null)) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Publishing cannot be enabled on the workspace root collection"
          });
        }

        const subtreeEntryIDs = await Promise.all(
          collectionIDs.map((collectionID) => {
            return getSubtreeEntryIDs(database, workspaceID, tree, collectionID);
          })
        );

        return filterAuthorizedEntryIDs({
          action: "publishing:publish",
          authorization,
          database,
          entryIDs: [...new Set(subtreeEntryIDs.flat())],
          workspaceID
        });
      })();

      await syncEntrySnapshots(workspaceID, entryIDs);
    }

    const currentCollections = await database
      .select({
        id: collections.id,
        parentID: collections.parentID,
        publishingEnabled: collections.publishingEnabled
      })
      .from(collections)
      .where(
        and(
          inArray(collections.id, collectionIDs),
          eq(collections.workspaceID, workspaceID),
          isNull(collections.deletedAt)
        )
      )
      .for("update");

    if (currentCollections.length !== collectionIDs.length) {
      throw new ORPCError("NOT_FOUND", { message: "Collection not found" });
    }

    if (input.enabled && currentCollections.some((collection) => collection.parentID === null)) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Publishing cannot be enabled on the workspace root collection"
      });
    }

    const tree = await loadPublishingTree(database, workspaceID);
    const collectionsByID = new Map(
      currentCollections.map((collection) => [collection.id, collection])
    );
    const treeCollectionsByID = new Map(
      tree.collections.map((collection) => [collection.id, collection])
    );
    const collectionParents = new Map(
      tree.collections.map((collection) => [collection.id, collection.parentID])
    );
    const orderedCollectionIDs = input.enabled
      ? [...collectionIDs].sort((left, right) => {
          return (
            getCollectionDepth(collectionParents, left) -
            getCollectionDepth(collectionParents, right)
          );
        })
      : collectionIDs;
    const results: SetCollectionPublishingResult[] = [];

    for (const collectionID of orderedCollectionIDs) {
      const collection = collectionsByID.get(collectionID)!;

      if (collection.publishingEnabled === input.enabled) {
        results.push({
          changed: false,
          collectionID,
          createdVersions: [],
          publishingEntries: [],
          publishedEntries: 0
        });
        continue;
      }

      const wasEnabled = isCollectionPublishingEnabled(tree, collectionID);

      if (input.enabled && !wasEnabled && input.publish === undefined) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Choose whether to publish the latest entry versions"
        });
      }

      await database
        .update(collections)
        .set({ publishingEnabled: input.enabled, updatedAt: new Date() })
        .where(eq(collections.id, collectionID));

      const treeCollection = treeCollectionsByID.get(collectionID);

      if (treeCollection) treeCollection.publishingEnabled = input.enabled;

      if (input.enabled) {
        const entryIDs = await getSubtreeEntryIDs(database, workspaceID, tree, collectionID);

        if (wasEnabled || !input.publish) {
          results.push({
            changed: true,
            collectionID,
            createdVersions: [],
            publishingEntries: wasEnabled
              ? []
              : entryIDs.map((entryID) => ({
                  entryID: toEntryID(entryID),
                  hasUnpublishedChanges: true,
                  versionID: null
                })),
            publishedEntries: 0
          });
          continue;
        }

        const publishableEntryIDs = await filterAuthorizedEntryIDs({
          action: "publishing:publish",
          authorization,
          database,
          entryIDs,
          workspaceID
        });
        const result = await publishEntries(database, {
          workspaceID,
          entries: publishableEntryIDs.map((entryID) => ({ entryID })),
          channel: PUBLISHED_CHANNEL_CODE,
          contributorIDs: input.contributorIDs
        });
        const publishedEntryIDs = new Set(publishableEntryIDs);
        const unpublishedEntries = entryIDs
          .filter((entryID) => !publishedEntryIDs.has(entryID))
          .map((entryID) => ({
            entryID: toEntryID(entryID),
            hasUnpublishedChanges: true,
            versionID: null
          }));

        results.push({
          changed: true,
          collectionID,
          ...result,
          publishingEntries: [...result.publishingEntries, ...unpublishedEntries]
        });
        continue;
      }

      const disabledEntryIDs = await getDisabledEntryIDs(database, workspaceID, tree, collectionID);

      if (disabledEntryIDs.length > 0) {
        await lockPublishingEntries(database, workspaceID, disabledEntryIDs);
        await database
          .delete(entryPublications)
          .where(inArray(entryPublications.entryID, disabledEntryIDs));
      }

      results.push({
        changed: true,
        collectionID,
        createdVersions: [],
        publishingEntries: disabledEntryIDs.map((entryID) => ({
          entryID: toEntryID(entryID),
          hasUnpublishedChanges: false,
          versionID: null
        })),
        publishedEntries: 0
      });
    }

    return results.map((result) => ({
      ...result,
      collectionID: toCollectionID(result.collectionID)
    }));
  }
);

export { setCollectionsPublishing };
