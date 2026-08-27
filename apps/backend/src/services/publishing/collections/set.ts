import { collections, entryPublications, workspaces } from "#backend/db";
import { db } from "#backend/lib/adapters";
import {
  getDisabledEntryIDs,
  getSubtreeEntryIDs,
  isCollectionPublishingEnabled,
  loadPublishingTree,
  PUBLISHED_CHANNEL_CODE,
  publishEntries,
  syncEntrySnapshots
} from "#backend/lib/publishing";
import { toUUID } from "#backend/lib/primitives";
import type { VersionSummary } from "#backend/lib/data";
import { ORPCError } from "@orpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { SessionData } from "#backend/lib/policy";
import { authorizeCollectionSources } from "../access";

interface SetCollectionPublishingResult {
  affectedEntryIDs: string[];
  changed: boolean;
  collectionID: string;
  createdVersions: VersionSummary[];
  publishedEntries: number;
}
interface SetCollectionsPublishingInput {
  auth: SessionData;
  workspaceID: string;
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
const setCollectionsPublishing = async (
  input: SetCollectionsPublishingInput
): Promise<SetCollectionPublishingResult[]> => {
  await authorizeCollectionSources(input.auth, input.collectionIDs, "publishing");

  const workspaceID = toUUID(input.workspaceID);
  const collectionIDs = [...new Set(input.collectionIDs.map(toUUID))];

  if (input.enabled && input.publish) {
    const entryIDs = await db.transaction(async (tx) => {
      const tree = await loadPublishingTree(tx, workspaceID);
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
          return getSubtreeEntryIDs(tx, workspaceID, tree, collectionID);
        })
      );

      return [...new Set(subtreeEntryIDs.flat())];
    });

    await syncEntrySnapshots(workspaceID, entryIDs);
  }

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");

    if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

    const currentCollections = await tx
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

    const tree = await loadPublishingTree(tx, workspaceID);
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
          affectedEntryIDs: [],
          changed: false,
          collectionID,
          createdVersions: [],
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

      await tx
        .update(collections)
        .set({ publishingEnabled: input.enabled, updatedAt: new Date() })
        .where(eq(collections.id, collectionID));

      const treeCollection = treeCollectionsByID.get(collectionID);

      if (treeCollection) treeCollection.publishingEnabled = input.enabled;

      if (input.enabled) {
        const entryIDs = await getSubtreeEntryIDs(tx, workspaceID, tree, collectionID);

        if (wasEnabled || !input.publish) {
          results.push({
            affectedEntryIDs: entryIDs,
            changed: true,
            collectionID,
            createdVersions: [],
            publishedEntries: 0
          });
          continue;
        }

        const result = await publishEntries(tx, {
          workspaceID,
          entries: entryIDs.map((entryID) => ({ entryID })),
          channel: PUBLISHED_CHANNEL_CODE,
          contributorIDs: input.contributorIDs
        });

        results.push({
          affectedEntryIDs: entryIDs,
          changed: true,
          collectionID,
          ...result
        });
        continue;
      }

      const disabledEntryIDs = await getDisabledEntryIDs(tx, workspaceID, tree, collectionID);

      if (disabledEntryIDs.length > 0) {
        await tx
          .delete(entryPublications)
          .where(inArray(entryPublications.entryID, disabledEntryIDs));
      }

      results.push({
        affectedEntryIDs: disabledEntryIDs,
        changed: true,
        collectionID,
        createdVersions: [],
        publishedEntries: 0
      });
    }

    return results;
  });
};

export { setCollectionsPublishing };
