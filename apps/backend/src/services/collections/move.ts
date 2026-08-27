import { rankBetweenNeighbors, toCollectionID, toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { collections, entryPublications, workspaces } from "#backend/db";
import {
  getDisabledEntryIDs,
  getSubtreeCollectionIDs,
  getSubtreeEntryIDs,
  isCollectionPublishingEnabled,
  loadPublishingTree,
  PUBLISHED_CHANNEL_CODE,
  publishEntries,
  syncEntrySnapshots
} from "#backend/lib/publishing";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import type { VersionSummary } from "#backend/lib/data";
import {
  assertCollectionMovePermission,
  hasCollectionPermission,
  loadRestrictedCollectionAccess,
  type SessionData
} from "#backend/lib/policy";

const moveCollection = async (input: {
  auth: SessionData;
  id: string;
  workspaceID: string;
  newParentID?: string | null;
  index?: number;
  publish?: boolean;
  contributorIDs: string[];
}): Promise<{
  affectedPublishingEntryIDs: string[];
  createdVersions: VersionSummary[];
  index: number;
  newParentID: string | null;
  restrictedBoundaryChanged: boolean;
}> => {
  const access = await loadRestrictedCollectionAccess(input.auth);
  const workspaceID = toUUID(input.workspaceID);
  const collectionID = toUUID(input.id);
  const requestedParentID = input.newParentID ? toUUID(input.newParentID) : null;
  const collection = access.allCollections.find(({ id }) => id === input.id);
  const sourceParentID = collection?.ancestors[collection.ancestors.length - 1];
  const sourceBoundaryID = sourceParentID
    ? access.boundaryByCollectionID.get(sourceParentID)
    : undefined;
  const targetBoundaryID = input.newParentID
    ? access.boundaryByCollectionID.get(input.newParentID)
    : undefined;
  const restrictedBoundaryChanged = sourceBoundaryID !== targetBoundaryID;
  const affectedCollections = access.allCollections.filter((item) => {
    return item.id === input.id || item.ancestors.includes(input.id);
  });
  const canPublish = [input.newParentID, ...affectedCollections.map(({ id }) => id)].every((id) => {
    return hasCollectionPermission(input.auth, access, id, "publishing");
  });

  assertCollectionMovePermission(input.auth, access, input.id, input.newParentID);

  if (input.publish) {
    if (!canPublish) {
      throw new ORPCError("FORBIDDEN", {
        message: "Publishing permission is required to move this collection"
      });
    }

    const entryIDs = await db.transaction(async (tx) => {
      const tree = await loadPublishingTree(tx, workspaceID);
      const collection = tree.collections.find(({ id }) => id === collectionID);
      const parentID = requestedParentID || tree.rootID;
      const parent = tree.collections.find(({ id }) => id === parentID);

      if (!collection) throw new ORPCError("NOT_FOUND");
      if (!collection.parentID) {
        throw new ORPCError("BAD_REQUEST", { message: "Cannot move the root collection" });
      }

      if (parentID === collectionID) {
        throw new ORPCError("BAD_REQUEST", { message: "Cannot move a collection into itself" });
      }

      if (!parent) throw new ORPCError("NOT_FOUND", { message: "Parent collection not found" });

      const subtreeCollectionIDs = getSubtreeCollectionIDs(tree, collectionID);

      if (subtreeCollectionIDs.includes(parentID)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Cannot move a collection into one of its descendants"
        });
      }

      const wasPublishingEnabled = isCollectionPublishingEnabled(tree, collectionID);
      const parentPublishingEnabled = isCollectionPublishingEnabled(tree, parentID);
      const willBePublishingEnabled = collection.publishingEnabled || parentPublishingEnabled;

      if (wasPublishingEnabled || !willBePublishingEnabled) return [];

      return getSubtreeEntryIDs(tx, workspaceID, tree, collectionID);
    });

    await syncEntrySnapshots(workspaceID, entryIDs);
  }

  return db.transaction(async (tx) => {
    await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");
    const [collection] = await tx
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.id, collectionID),
          eq(collections.workspaceID, workspaceID),
          isNull(collections.deletedAt)
        )
      )
      .for("update");

    if (!collection) throw new ORPCError("NOT_FOUND");
    if (!collection.parentID) {
      throw new ORPCError("BAD_REQUEST", { message: "Cannot move the root collection" });
    }

    const [root] = await tx
      .select({ id: collections.id })
      .from(collections)
      .where(
        and(
          eq(collections.workspaceID, workspaceID),
          isNull(collections.parentID),
          isNull(collections.deletedAt)
        )
      );
    const parentID = requestedParentID || root?.id;

    if (!parentID || parentID === collectionID) {
      throw new ORPCError("BAD_REQUEST", { message: "Cannot move a collection into itself" });
    }

    const [parent] = await tx
      .select({ id: collections.id })
      .from(collections)
      .where(
        and(
          eq(collections.id, parentID),
          eq(collections.workspaceID, workspaceID),
          isNull(collections.deletedAt)
        )
      );

    if (!parent) throw new ORPCError("NOT_FOUND", { message: "Parent collection not found" });

    const cycle = await tx.execute<{ id: string }>(sql`
      with recursive subtree as (
        select id from ${collections}
        where workspace_id = ${workspaceID}::uuid
          and id = ${collectionID}::uuid
          and deleted_at is null
        union all
        select child.id
        from ${collections} child
        inner join subtree parent on child.parent_id = parent.id
        where child.workspace_id = ${workspaceID}::uuid
          and child.deleted_at is null
      )
      select id from subtree where id = ${parentID}::uuid limit 1
    `);

    if (cycle.rows.length > 0) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Cannot move a collection into one of its descendants"
      });
    }

    const publishingTree = await loadPublishingTree(tx, workspaceID);
    const wasPublishingEnabled = isCollectionPublishingEnabled(publishingTree, collectionID);
    const parentPublishingEnabled = isCollectionPublishingEnabled(publishingTree, parentID);
    const willBePublishingEnabled = collection.publishingEnabled || parentPublishingEnabled;
    const crossesPublishingBoundary = wasPublishingEnabled !== willBePublishingEnabled;

    if (crossesPublishingBoundary && !canPublish) {
      throw new ORPCError("FORBIDDEN", {
        message: "Publishing permission is required to move this collection"
      });
    }

    if (!wasPublishingEnabled && willBePublishingEnabled && input.publish === undefined) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Choose whether to publish the latest entry versions"
      });
    }

    const siblings = await tx
      .select({ id: collections.id, rank: collections.rank })
      .from(collections)
      .where(
        and(
          eq(collections.workspaceID, workspaceID),
          eq(collections.parentID, parentID),
          isNull(collections.deletedAt)
        )
      )
      .orderBy(asc(collections.rank));
    const destination = siblings.filter((sibling) => sibling.id !== collectionID);
    const existingIndex = siblings.findIndex((sibling) => sibling.id === collectionID);
    const requestedIndex = input.index ?? (existingIndex >= 0 ? existingIndex : destination.length);
    const index = Math.min(Math.max(requestedIndex, 0), destination.length);
    const rank = rankBetweenNeighbors(destination[index - 1]?.rank, destination[index]?.rank);

    await tx
      .update(collections)
      .set({ parentID, rank, updatedAt: new Date() })
      .where(
        and(
          eq(collections.id, collectionID),
          eq(collections.workspaceID, workspaceID),
          isNull(collections.deletedAt)
        )
      );

    const treeCollection = publishingTree.collections.find((item) => item.id === collectionID);
    let createdVersions: VersionSummary[] = [];

    if (treeCollection) treeCollection.parentID = parentID;

    if (!wasPublishingEnabled && willBePublishingEnabled && input.publish) {
      const entryIDs = await getSubtreeEntryIDs(tx, workspaceID, publishingTree, collectionID);

      const result = await publishEntries(tx, {
        workspaceID,
        entries: entryIDs.map((entryID) => ({ entryID })),
        channel: PUBLISHED_CHANNEL_CODE,
        contributorIDs: input.contributorIDs
      });

      createdVersions = result.createdVersions;
    }

    if (wasPublishingEnabled && !willBePublishingEnabled) {
      const disabledEntryIDs = await getDisabledEntryIDs(
        tx,
        workspaceID,
        publishingTree,
        collectionID
      );

      if (disabledEntryIDs.length > 0) {
        await tx
          .delete(entryPublications)
          .where(inArray(entryPublications.entryID, disabledEntryIDs));
      }
    }

    const affectedPublishingEntryIDs = crossesPublishingBoundary
      ? await getSubtreeEntryIDs(tx, workspaceID, publishingTree, collectionID)
      : [];

    return {
      index,
      newParentID: requestedParentID ? toCollectionID(requestedParentID) : null,
      affectedPublishingEntryIDs,
      createdVersions,
      restrictedBoundaryChanged
    };
  });
};

export { moveCollection };
