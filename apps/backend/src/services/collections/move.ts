import { rankBetweenNeighbors, toCollectionID, toEntryID, toUUID } from "#backend/lib/primitives";
import { collections, entryPublications } from "#backend/db";
import {
  getDisabledEntryIDs,
  getSubtreeEntryIDs,
  isCollectionPublishingEnabled,
  lockPublishingEntries,
  loadPublishingTree
} from "#backend/lib/publishing";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { filterAuthorizedEntryIDs, withAuthorization } from "#backend/lib/policy";
import type { PublishingEntryStatus } from "#backend/lib/publishing";

interface MoveCollectionInput {
  id: string;
  newParentID?: string | null;
  index?: number;
}
interface MoveCollectionResult {
  index: number;
  newParentID: string | null;
  publishingEntries: PublishingEntryStatus[];
  restrictedBoundaryChanged: boolean;
}

const moveCollection = withAuthorization<MoveCollectionInput, undefined, MoveCollectionResult>(
  {
    actions: ({ input }) => ({
      collections: [
        { action: "collection:move", collectionID: input.id },
        { action: "collection:create-child", collectionID: input.newParentID }
      ]
    }),
    tree: true,
    transaction: "locked-workspace"
  },
  async ({ authorization, database, input, workspaceID }) => {
    const collectionID = toUUID(input.id);
    const requestedParentID = input.newParentID ? toUUID(input.newParentID) : null;

    const [collection] = await database
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
      throw new ORPCError("NOT_FOUND");
    }

    const [root] = await database
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

    const [parent] = await database
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

    const cycle = await database.execute<{ id: string }>(sql`
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

    const publishingTree = await loadPublishingTree(database, workspaceID);
    const wasPublishingEnabled = isCollectionPublishingEnabled(publishingTree, collectionID);
    const parentPublishingEnabled = isCollectionPublishingEnabled(publishingTree, parentID);
    const willBePublishingEnabled = collection.publishingEnabled || parentPublishingEnabled;
    const restrictedBoundaryChanged =
      authorization.getRestrictedBoundaryID(collection.parentID) !==
      authorization.getRestrictedBoundaryID(parentID);

    if (wasPublishingEnabled && !willBePublishingEnabled) {
      authorization.assertFullyVisibleSubtree(input.id);
    }

    const siblings = await database
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

    await database
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
    let publishingEntryIDs: string[] = [];

    if (treeCollection) treeCollection.parentID = parentID;

    if (wasPublishingEnabled && !willBePublishingEnabled) {
      const disabledEntryIDs = await getDisabledEntryIDs(
        database,
        workspaceID,
        publishingTree,
        collectionID
      );

      if (disabledEntryIDs.length > 0) {
        await lockPublishingEntries(database, workspaceID, disabledEntryIDs);
        await database
          .delete(entryPublications)
          .where(inArray(entryPublications.entryID, disabledEntryIDs));
      }

      publishingEntryIDs = disabledEntryIDs;
    } else if (!wasPublishingEnabled && willBePublishingEnabled) {
      publishingEntryIDs = await getSubtreeEntryIDs(
        database,
        workspaceID,
        publishingTree,
        collectionID
      );
    }

    const affectedPublishingEntryIDs = await filterAuthorizedEntryIDs({
      action: "publishing:publish",
      authorization,
      database,
      entryIDs: publishingEntryIDs,
      workspaceID
    });

    return {
      index,
      newParentID: requestedParentID ? toCollectionID(requestedParentID) : null,
      publishingEntries: affectedPublishingEntryIDs.map((entryID) => ({
        entryID: toEntryID(entryID),
        hasUnpublishedChanges: willBePublishingEnabled,
        versionID: null
      })),
      restrictedBoundaryChanged
    };
  }
);

export { moveCollection };
