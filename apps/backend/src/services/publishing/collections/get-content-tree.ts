import {
  collections,
  entries,
  entryPublications,
  entryVersions,
  publishingChannels
} from "#backend/db";
import { db } from "#backend/lib/adapters";
import {
  getSubtreeCollectionIDs,
  isCollectionPublishingEnabled,
  loadPublishingTree,
  normalizePublishingChannelCode
} from "#backend/lib/publishing";
import { toCollectionID, toEntryID, toUUID, toVersionID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";

interface PublishedTreeEntry {
  id: string;
  name: string;
  version: {
    id: string;
    hash: string;
  };
}
interface PublishedTreeCollection {
  id: string;
  name: string;
  entries: PublishedTreeEntry[];
  collections: PublishedTreeCollection[];
}
interface PublishedContentTree {
  channel: string;
  collection: PublishedTreeCollection;
}

const getPublishedContentTree = async (input: {
  workspaceID: string;
  collectionID: string;
  channel: string;
}): Promise<PublishedContentTree> => {
  const workspaceID = toUUID(input.workspaceID);
  const collectionID = toUUID(input.collectionID);
  const channel = normalizePublishingChannelCode(input.channel);

  return db.transaction(async (tx) => {
    const tree = await loadPublishingTree(tx, workspaceID);
    const collection = tree.collections.find(({ id }) => id === collectionID);

    if (!collection || collection.parentID === null) {
      throw new ORPCError("NOT_FOUND", { message: "Published collection not found" });
    }

    if (!isCollectionPublishingEnabled(tree, collectionID)) {
      throw new ORPCError("NOT_FOUND", { message: "Published collection not found" });
    }

    const [publishingChannel] = await tx
      .select({ id: publishingChannels.id })
      .from(publishingChannels)
      .where(
        and(eq(publishingChannels.workspaceID, workspaceID), eq(publishingChannels.code, channel))
      );

    if (!publishingChannel) {
      throw new ORPCError("NOT_FOUND", { message: "Publishing channel not found" });
    }

    const collectionIDs = getSubtreeCollectionIDs(tree, collectionID);
    const collectionRows = await tx
      .select({ id: collections.id, name: collections.name, parentID: collections.parentID })
      .from(collections)
      .where(
        and(
          eq(collections.workspaceID, workspaceID),
          inArray(collections.id, collectionIDs),
          isNull(collections.deletedAt)
        )
      )
      .orderBy(asc(collections.rank), asc(collections.id));
    const entryRows = await tx
      .select({
        id: entries.id,
        collectionID: entries.collectionID,
        entryName: entryVersions.entryName,
        versionID: entryVersions.id,
        versionHash: entryVersions.hash
      })
      .from(entries)
      .innerJoin(
        entryPublications,
        and(
          eq(entryPublications.entryID, entries.id),
          eq(entryPublications.channelID, publishingChannel.id)
        )
      )
      .innerJoin(entryVersions, eq(entryVersions.id, entryPublications.versionID))
      .where(
        and(
          eq(entries.workspaceID, workspaceID),
          inArray(entries.collectionID, collectionIDs),
          isNull(entries.deletedAt)
        )
      )
      .orderBy(asc(entries.rank), asc(entries.id));
    const entriesByCollection = new Map<string, PublishedTreeEntry[]>();
    const collectionsByParent = new Map<string, typeof collectionRows>();

    for (const row of entryRows) {
      if (!row.collectionID) continue;

      const collectionEntries = entriesByCollection.get(row.collectionID) || [];

      collectionEntries.push({
        id: toEntryID(row.id),
        name: row.entryName,
        version: {
          id: toVersionID(row.versionID),
          hash: row.versionHash
        }
      });
      entriesByCollection.set(row.collectionID, collectionEntries);
    }

    for (const row of collectionRows) {
      if (!row.parentID) continue;

      const childCollections = collectionsByParent.get(row.parentID) || [];

      childCollections.push(row);
      collectionsByParent.set(row.parentID, childCollections);
    }

    const mapCollection = (row: (typeof collectionRows)[number]): PublishedTreeCollection => {
      return {
        id: toCollectionID(row.id),
        name: row.name,
        entries: entriesByCollection.get(row.id) || [],
        collections: (collectionsByParent.get(row.id) || []).map(mapCollection)
      };
    };
    const root = collectionRows.find(({ id }) => id === collectionID);

    if (!root) {
      throw new ORPCError("NOT_FOUND", { message: "Published collection not found" });
    }

    return { channel, collection: mapCollection(root) };
  });
};

export { getPublishedContentTree };
export type { PublishedContentTree, PublishedTreeCollection, PublishedTreeEntry };
