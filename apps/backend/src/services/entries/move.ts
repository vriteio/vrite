import { rankBetweenNeighbors, toEntryID, toUUID } from "#backend/lib/primitives";
import { collections, entries, entryPublications } from "#backend/db";
import { isCollectionPublishingEnabled, loadPublishingTree } from "#backend/lib/publishing";
import { and, desc, eq, gt, isNull, lt, ne } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { withAuthorization } from "#backend/lib/policy";
import type { PublishingEntryStatus } from "#backend/lib/publishing";

interface MoveEntryInput {
  id: string;
  order: string;
  collectionID?: string | null;
}
interface MoveEntryResult {
  order: string;
  publishingEntries: PublishingEntryStatus[];
  restrictedBoundaryChanged: boolean;
}
interface ResolvedMoveEntry {
  destinationCollectionID: string | null;
  sourceCollectionID: string | null;
}

const moveEntry = withAuthorization<MoveEntryInput, ResolvedMoveEntry, MoveEntryResult>(
  {
    actions: ({ resolved }) => ({
      entries: [
        { action: "entry:move", collectionID: resolved.sourceCollectionID },
        { action: "entry:create", collectionID: resolved.destinationCollectionID }
      ]
    }),
    resolve: async ({ database, input, workspaceID }) => {
      const [entry] = await database
        .select({ collectionID: entries.collectionID })
        .from(entries)
        .where(
          and(
            eq(entries.id, toUUID(input.id)),
            eq(entries.workspaceID, workspaceID),
            isNull(entries.deletedAt)
          )
        )
        .for("update");

      if (!entry) throw new ORPCError("NOT_FOUND");

      const destinationCollectionID =
        input.collectionID === undefined
          ? entry.collectionID
          : input.collectionID === null
            ? null
            : toUUID(input.collectionID);

      if (destinationCollectionID) {
        const [collection] = await database
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

      return { destinationCollectionID, sourceCollectionID: entry.collectionID };
    },
    tree: true,
    transaction: "locked-workspace"
  },
  async ({ authorization, database, input, resolved, workspaceID }) => {
    const entryID = toUUID(input.id);
    const { destinationCollectionID, sourceCollectionID } = resolved;

    const publishingTree = await loadPublishingTree(database, workspaceID);
    const wasPublishingEnabled = isCollectionPublishingEnabled(publishingTree, sourceCollectionID);
    const willBePublishingEnabled = isCollectionPublishingEnabled(
      publishingTree,
      destinationCollectionID
    );
    const crossesPublishingBoundary = wasPublishingEnabled !== willBePublishingEnabled;
    const restrictedBoundaryChanged =
      authorization.getRestrictedBoundaryID(sourceCollectionID) !==
      authorization.getRestrictedBoundaryID(destinationCollectionID);

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
    const [collision] = await database
      .select({ rank: entries.rank })
      .from(entries)
      .where(and(siblingFilter, eq(entries.rank, input.order)))
      .limit(1);
    let rank = input.order;

    if (collision) {
      const [lower] = await database
        .select({ rank: entries.rank })
        .from(entries)
        .where(and(siblingFilter, lt(entries.rank, input.order)))
        .orderBy(desc(entries.rank))
        .limit(1);

      if (lower) {
        rank = rankBetweenNeighbors(lower.rank, input.order);
      } else {
        const [upper] = await database
          .select({ rank: entries.rank })
          .from(entries)
          .where(and(siblingFilter, gt(entries.rank, input.order)))
          .orderBy(entries.rank)
          .limit(1);

        rank = rankBetweenNeighbors(input.order, upper?.rank);
      }
    }

    await database
      .update(entries)
      .set({
        rank,
        ...(input.collectionID !== undefined && { collectionID: destinationCollectionID }),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(entries.id, entryID),
          eq(entries.workspaceID, workspaceID),
          isNull(entries.deletedAt)
        )
      );

    if (wasPublishingEnabled && !willBePublishingEnabled) {
      await database.delete(entryPublications).where(eq(entryPublications.entryID, entryID));
    }

    return {
      order: rank,
      publishingEntries: crossesPublishingBoundary
        ? [
            {
              entryID: toEntryID(entryID),
              hasUnpublishedChanges: willBePublishingEnabled,
              versionID: null
            }
          ]
        : [],
      restrictedBoundaryChanged
    };
  }
);

export { moveEntry };
