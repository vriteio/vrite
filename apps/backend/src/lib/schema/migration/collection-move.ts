import { collections } from "#backend/db/collections";
import { schemaMigrations } from "#backend/db/content-schemas";
import { contents } from "#backend/db/contents";
import { entryPublications, publishingChannels } from "#backend/db/publishing";
import { entryVersions } from "#backend/db/versions";
import { workspaces } from "#backend/db/workspaces";
import { rankBetweenNeighbors, toCollectionID, toEntryID } from "#backend/lib/primitives";
import { PUBLISHED_CHANNEL_CODE } from "#backend/lib/publishing/config";
import { and, asc, eq, inArray, isNull, ne } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

type CollectionMoveDatabase = Pick<NodePgDatabase, "select" | "update">;

const restoreSchemaCollectionMove = async (
  database: CollectionMoveDatabase,
  migrationID: string,
  workspaceID: string
) => {
  await database
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceID))
    .for("update");

  const [migration] = await database
    .select({ move: schemaMigrations.collectionMove })
    .from(schemaMigrations)
    .where(and(eq(schemaMigrations.id, migrationID), eq(schemaMigrations.workspaceID, workspaceID)))
    .for("update");
  const move = migration?.move;

  if (!move) return null;

  const [parent] = await database
    .select({ parentID: collections.parentID })
    .from(collections)
    .where(and(eq(collections.id, move.sourceParentID), isNull(collections.deletedAt)));

  if (!parent) throw new Error("Original collection parent is unavailable");

  const siblings = await database
    .select({ rank: collections.rank })
    .from(collections)
    .where(
      and(
        eq(collections.workspaceID, workspaceID),
        eq(collections.parentID, move.sourceParentID),
        ne(collections.id, move.collectionID),
        isNull(collections.deletedAt)
      )
    )
    .orderBy(asc(collections.rank));
  const collision = siblings.some(({ rank }) => rank === move.sourceOrder);
  const order = collision
    ? rankBetweenNeighbors(siblings[siblings.length - 1]?.rank)
    : move.sourceOrder;
  const index = siblings.filter(({ rank }) => rank < order).length;

  await database
    .update(collections)
    .set({ parentID: move.sourceParentID, rank: order, updatedAt: new Date() })
    .where(and(eq(collections.id, move.collectionID), eq(collections.workspaceID, workspaceID)));

  const contentRows =
    move.entryIDs.length > 0
      ? await database
          .select({
            entryID: contents.entryID,
            hash: contents.hash,
            publishedHash: entryVersions.hash
          })
          .from(contents)
          .leftJoin(
            publishingChannels,
            and(
              eq(publishingChannels.workspaceID, workspaceID),
              eq(publishingChannels.code, PUBLISHED_CHANNEL_CODE)
            )
          )
          .leftJoin(
            entryPublications,
            and(
              eq(entryPublications.entryID, contents.entryID),
              eq(entryPublications.channelID, publishingChannels.id)
            )
          )
          .leftJoin(entryVersions, eq(entryVersions.id, entryPublications.versionID))
          .where(inArray(contents.entryID, move.entryIDs))
      : [];

  return {
    move: {
      id: toCollectionID(move.collectionID),
      newParentID: parent.parentID ? toCollectionID(move.sourceParentID) : null,
      index,
      restrictedBoundaryChanged: true
    },
    entryIDs: move.entryIDs,
    publishingContent: contentRows.map((content) => ({
      entryID: toEntryID(content.entryID),
      matchesPublishedVersion: Boolean(
        content.publishedHash && content.hash === content.publishedHash
      )
    }))
  };
};

export { restoreSchemaCollectionMove };
