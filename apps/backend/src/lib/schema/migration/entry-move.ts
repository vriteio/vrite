import { entries } from "#backend/db/entries";
import { schemaMigrations } from "#backend/db/content-schemas";
import { workspaces } from "#backend/db/workspaces";
import { contents } from "#backend/db/contents";
import { entryPublications, publishingChannels } from "#backend/db/publishing";
import { entryVersions } from "#backend/db/versions";
import { PUBLISHED_CHANNEL_CODE } from "#backend/lib/publishing/config";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { rankBetweenNeighbors, toCollectionID, toEntryID } from "#backend/lib/primitives";
import { and, desc, eq, isNull, ne } from "drizzle-orm";

type EntryMoveDatabase = Pick<NodePgDatabase, "select" | "update">;

const restoreSchemaEntryMove = async (
  database: EntryMoveDatabase,
  migrationID: string,
  workspaceID: string
) => {
  // Serialize the restored rank with normal explorer changes, including root entries.
  await database
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceID))
    .for("update");

  const [migration] = await database
    .select({ move: schemaMigrations.entryMove })
    .from(schemaMigrations)
    .where(and(eq(schemaMigrations.id, migrationID), eq(schemaMigrations.workspaceID, workspaceID)))
    .for("update");
  const move = migration?.move;

  if (!move) return null;

  const siblings = and(
    eq(entries.workspaceID, workspaceID),
    move.sourceCollectionID
      ? eq(entries.collectionID, move.sourceCollectionID)
      : isNull(entries.collectionID),
    ne(entries.id, move.entryID),
    isNull(entries.deletedAt)
  );
  const [collision] = await database
    .select({ id: entries.id })
    .from(entries)
    .where(and(siblings, eq(entries.rank, move.sourceOrder)))
    .limit(1);
  let order = move.sourceOrder;

  if (collision) {
    const [last] = await database
      .select({ rank: entries.rank })
      .from(entries)
      .where(siblings)
      .orderBy(desc(entries.rank))
      .limit(1);

    order = rankBetweenNeighbors(last?.rank);
  }

  await database
    .update(entries)
    .set({ collectionID: move.sourceCollectionID, rank: order, updatedAt: new Date() })
    .where(and(eq(entries.id, move.entryID), eq(entries.workspaceID, workspaceID)));

  const [content] = await database
    .select({ hash: contents.hash, publishedHash: entryVersions.hash })
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
    .where(eq(contents.entryID, move.entryID));

  return {
    move: {
      id: toEntryID(move.entryID),
      collectionID: move.sourceCollectionID ? toCollectionID(move.sourceCollectionID) : null,
      order,
      restrictedBoundaryChanged: true
    },
    publishingContent: {
      entryID: toEntryID(move.entryID),
      matchesPublishedVersion: Boolean(
        content?.publishedHash && content.hash === content.publishedHash
      )
    }
  };
};

export { restoreSchemaEntryMove };
