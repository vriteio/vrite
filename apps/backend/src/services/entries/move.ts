import { rankBetweenNeighbors, toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { collections, entries, entryPublications, workspaces } from "#backend/db";
import {
  isCollectionPublishingEnabled,
  loadPublishingTree,
  PUBLISHED_CHANNEL_CODE,
  publishEntries,
  syncEntrySnapshots
} from "#backend/lib/publishing";
import { and, desc, eq, gt, isNull, lt, ne } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import type { VersionSummary } from "#backend/lib/data";
import {
  assertCollectionMovePermission,
  getEntryCollection,
  hasCollectionPermission,
  loadRestrictedCollectionAccess,
  type SessionData
} from "#backend/lib/policy";

const shouldSyncPublishingSnapshot = async (input: {
  workspaceID: string;
  entryID: string;
  destinationCollectionID?: string | null;
}): Promise<boolean> => {
  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, input.workspaceID));

    if (!workspace) throw new ORPCError("NOT_FOUND");

    const [entry] = await tx
      .select({ collectionID: entries.collectionID })
      .from(entries)
      .where(
        and(
          eq(entries.id, input.entryID),
          eq(entries.workspaceID, input.workspaceID),
          isNull(entries.deletedAt)
        )
      );

    if (!entry) throw new ORPCError("NOT_FOUND");

    const destinationCollectionID =
      input.destinationCollectionID === undefined
        ? entry.collectionID
        : input.destinationCollectionID;

    if (destinationCollectionID) {
      const [collection] = await tx
        .select({ id: collections.id })
        .from(collections)
        .where(
          and(
            eq(collections.id, destinationCollectionID),
            eq(collections.workspaceID, input.workspaceID),
            isNull(collections.deletedAt)
          )
        );

      if (!collection) throw new ORPCError("BAD_REQUEST", { message: "Collection not found" });
    }

    const publishingTree = await loadPublishingTree(tx, input.workspaceID);

    return (
      !isCollectionPublishingEnabled(publishingTree, entry.collectionID) &&
      isCollectionPublishingEnabled(publishingTree, destinationCollectionID)
    );
  });
};
const moveEntry = async (input: {
  auth: SessionData;
  id: string;
  workspaceID: string;
  order: string;
  collectionID?: string | null;
  publish?: boolean;
  contributorIDs: string[];
}): Promise<{
  affectedPublishingEntryIDs: string[];
  createdVersions: VersionSummary[];
  order: string;
  restrictedBoundaryChanged: boolean;
}> => {
  const access = await loadRestrictedCollectionAccess(input.auth);
  const entry = await getEntryCollection(input.auth, input.id);
  const workspaceID = toUUID(input.workspaceID);
  const entryID = toUUID(input.id);
  const collectionID =
    input.collectionID === undefined
      ? undefined
      : input.collectionID === null
        ? null
        : toUUID(input.collectionID);
  const destinationCollectionID =
    input.collectionID === undefined ? entry.collectionID : input.collectionID;
  const restrictedBoundaryChanged =
    access.boundaryByCollectionID.get(entry.collectionID || "") !==
    access.boundaryByCollectionID.get(destinationCollectionID || "");
  const canPublish = [entry.collectionID, destinationCollectionID].every((id) => {
    return hasCollectionPermission(input.auth, access, id, "publishing");
  });

  assertCollectionMovePermission(input.auth, access, entry.collectionID, destinationCollectionID);

  if (input.publish) {
    if (!canPublish) {
      throw new ORPCError("FORBIDDEN", {
        message: "Publishing permission is required to move this entry"
      });
    }

    const shouldSync = await shouldSyncPublishingSnapshot({
      workspaceID,
      entryID,
      destinationCollectionID: collectionID
    });

    if (shouldSync) await syncEntrySnapshots(workspaceID, [entryID]);
  }

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");

    if (!workspace) throw new ORPCError("NOT_FOUND");

    const [entry] = await tx
      .select({ collectionID: entries.collectionID })
      .from(entries)
      .where(
        and(
          eq(entries.id, entryID),
          eq(entries.workspaceID, workspaceID),
          isNull(entries.deletedAt)
        )
      )
      .for("update");

    if (!entry) throw new ORPCError("NOT_FOUND");

    const destinationCollectionID = collectionID === undefined ? entry.collectionID : collectionID;

    if (destinationCollectionID) {
      const [collection] = await tx
        .select({ id: collections.id })
        .from(collections)
        .where(
          and(
            eq(collections.id, destinationCollectionID),
            eq(collections.workspaceID, workspaceID),
            isNull(collections.deletedAt)
          )
        )
        .for("update");

      if (!collection) throw new ORPCError("BAD_REQUEST", { message: "Collection not found" });
    }

    const publishingTree = await loadPublishingTree(tx, workspaceID);
    const wasPublishingEnabled = isCollectionPublishingEnabled(publishingTree, entry.collectionID);
    const willBePublishingEnabled = isCollectionPublishingEnabled(
      publishingTree,
      destinationCollectionID
    );
    const crossesPublishingBoundary = wasPublishingEnabled !== willBePublishingEnabled;

    if (crossesPublishingBoundary && !canPublish) {
      throw new ORPCError("FORBIDDEN", {
        message: "Publishing permission is required to move this entry"
      });
    }

    if (!wasPublishingEnabled && willBePublishingEnabled && input.publish === undefined) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Choose whether to publish the latest entry version"
      });
    }

    const siblingFilter = destinationCollectionID
      ? and(
          eq(entries.workspaceID, workspaceID),
          eq(entries.collectionID, destinationCollectionID),
          ne(entries.id, entryID),
          isNull(entries.deletedAt)
        )
      : and(
          eq(entries.workspaceID, workspaceID),
          isNull(entries.collectionID),
          ne(entries.id, entryID),
          isNull(entries.deletedAt)
        );
    const [collision] = await tx
      .select({ rank: entries.rank })
      .from(entries)
      .where(and(siblingFilter, eq(entries.rank, input.order)))
      .limit(1);
    let rank = input.order;

    if (collision) {
      const [lower] = await tx
        .select({ rank: entries.rank })
        .from(entries)
        .where(and(siblingFilter, lt(entries.rank, input.order)))
        .orderBy(desc(entries.rank))
        .limit(1);

      if (lower) {
        rank = rankBetweenNeighbors(lower.rank, input.order);
      } else {
        const [upper] = await tx
          .select({ rank: entries.rank })
          .from(entries)
          .where(and(siblingFilter, gt(entries.rank, input.order)))
          .orderBy(entries.rank)
          .limit(1);

        rank = rankBetweenNeighbors(input.order, upper?.rank);
      }
    }

    await tx
      .update(entries)
      .set({
        rank,
        ...(collectionID !== undefined && { collectionID }),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(entries.id, entryID),
          eq(entries.workspaceID, workspaceID),
          isNull(entries.deletedAt)
        )
      );

    let createdVersions: VersionSummary[] = [];

    if (!wasPublishingEnabled && willBePublishingEnabled && input.publish) {
      const result = await publishEntries(tx, {
        workspaceID,
        entries: [{ entryID }],
        channel: PUBLISHED_CHANNEL_CODE,
        contributorIDs: input.contributorIDs
      });

      createdVersions = result.createdVersions;
    }

    if (wasPublishingEnabled && !willBePublishingEnabled) {
      await tx.delete(entryPublications).where(eq(entryPublications.entryID, entryID));
    }

    return {
      order: rank,
      affectedPublishingEntryIDs: crossesPublishingBoundary ? [input.id] : [],
      createdVersions,
      restrictedBoundaryChanged
    };
  });
};

export { moveEntry };
