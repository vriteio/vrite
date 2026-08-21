import { collections, entryPublications, workspaces } from "#backend/db";
import { db } from "#backend/lib/adapters";
import {
  getDisabledEntryIDs,
  getSubtreeEntryIDs,
  isCollectionPublishingEnabled,
  loadPublishingTree,
  PUBLISHED_CHANNEL_NAME,
  publishEntries,
  syncEntrySnapshots
} from "#backend/lib/publishing";
import { toUUID } from "#backend/lib/primitives";
import type { VersionSummary } from "#backend/lib/data";
import { ORPCError } from "@orpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";

const setCollectionPublishing = async (input: {
  workspaceID: string;
  collectionID: string;
  enabled: boolean;
  publish?: boolean;
  contributorIDs: string[];
}): Promise<{
  affectedEntryIDs: string[];
  changed: boolean;
  createdVersions: VersionSummary[];
  publishedEntries: number;
}> => {
  const workspaceID = toUUID(input.workspaceID);
  const collectionID = toUUID(input.collectionID);

  if (input.enabled) {
    const entryIDs = await db.transaction(async (tx) => {
      const tree = await loadPublishingTree(tx, workspaceID);
      const collection = tree.collections.find(({ id }) => id === collectionID);

      if (!collection) throw new ORPCError("NOT_FOUND", { message: "Collection not found" });

      if (collection.parentID === null) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Publishing cannot be enabled on the workspace root collection"
        });
      }

      return input.publish ? getSubtreeEntryIDs(tx, workspaceID, tree, collectionID) : [];
    });

    if (input.publish) await syncEntrySnapshots(workspaceID, entryIDs);
  }

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");

    if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

    const [collection] = await tx
      .select({
        id: collections.id,
        parentID: collections.parentID,
        publishingEnabled: collections.publishingEnabled
      })
      .from(collections)
      .where(
        and(
          eq(collections.id, collectionID),
          eq(collections.workspaceID, workspaceID),
          isNull(collections.deletedAt)
        )
      )
      .for("update");

    if (!collection) throw new ORPCError("NOT_FOUND", { message: "Collection not found" });

    if (input.enabled && collection.parentID === null) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Publishing cannot be enabled on the workspace root collection"
      });
    }

    if (collection.publishingEnabled === input.enabled) {
      return {
        affectedEntryIDs: [],
        changed: false,
        createdVersions: [],
        publishedEntries: 0
      };
    }

    const tree = await loadPublishingTree(tx, workspaceID);
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

    const treeCollection = tree.collections.find((item) => item.id === collectionID);

    if (treeCollection) treeCollection.publishingEnabled = input.enabled;

    if (input.enabled) {
      const entryIDs = await getSubtreeEntryIDs(tx, workspaceID, tree, collectionID);

      if (wasEnabled || !input.publish) {
        return {
          affectedEntryIDs: entryIDs,
          changed: true,
          createdVersions: [],
          publishedEntries: 0
        };
      }

      const result = await publishEntries(tx, {
        workspaceID,
        entryIDs,
        channel: PUBLISHED_CHANNEL_NAME,
        contributorIDs: input.contributorIDs
      });

      return {
        affectedEntryIDs: entryIDs,
        changed: true,
        ...result
      };
    }

    const disabledEntryIDs = await getDisabledEntryIDs(tx, workspaceID, tree, collectionID);

    if (disabledEntryIDs.length > 0) {
      await tx
        .delete(entryPublications)
        .where(inArray(entryPublications.entryID, disabledEntryIDs));
    }

    return {
      affectedEntryIDs: disabledEntryIDs,
      changed: true,
      createdVersions: [],
      publishedEntries: 0
    };
  });
};

export { setCollectionPublishing };
