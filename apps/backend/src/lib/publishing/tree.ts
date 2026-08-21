import { collections, entries } from "#backend/db";
import type { db } from "#backend/lib/adapters";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";

interface PublishingCollection {
  id: string;
  parentID: string | null;
  publishingEnabled: boolean;
}
interface PublishingTree {
  collections: PublishingCollection[];
  rootID: string;
}

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const loadPublishingTree = async (
  tx: DatabaseTransaction,
  workspaceID: string
): Promise<PublishingTree> => {
  const rows = await tx
    .select({
      id: collections.id,
      parentID: collections.parentID,
      publishingEnabled: collections.publishingEnabled
    })
    .from(collections)
    .where(and(eq(collections.workspaceID, workspaceID), isNull(collections.deletedAt)))
    .orderBy(asc(collections.id));
  const root = rows.find((collection) => collection.parentID === null);

  if (!root) throw new Error("Workspace root collection not found");

  return { collections: rows, rootID: root.id };
};
const isCollectionPublishingEnabled = (
  tree: PublishingTree,
  collectionID: string | null
): boolean => {
  const byID = new Map(tree.collections.map((collection) => [collection.id, collection]));
  let collection = byID.get(collectionID || tree.rootID);

  while (collection) {
    if (collection.publishingEnabled) return true;

    collection = collection.parentID ? byID.get(collection.parentID) : undefined;
  }

  return false;
};
const getSubtreeCollectionIDs = (tree: PublishingTree, collectionID: string): string[] => {
  const collectionIDs = new Set([collectionID]);
  let changed = true;

  while (changed) {
    changed = false;

    for (const collection of tree.collections) {
      if (collection.parentID && collectionIDs.has(collection.parentID)) {
        const previousSize = collectionIDs.size;

        collectionIDs.add(collection.id);
        changed ||= collectionIDs.size !== previousSize;
      }
    }
  }

  return [...collectionIDs];
};
const getSubtreeEntryIDs = async (
  tx: DatabaseTransaction,
  workspaceID: string,
  tree: PublishingTree,
  collectionID: string
): Promise<string[]> => {
  const collectionIDs = getSubtreeCollectionIDs(tree, collectionID);
  const includesRoot = collectionIDs.includes(tree.rootID);
  const collectionFilter = includesRoot
    ? or(inArray(entries.collectionID, collectionIDs), isNull(entries.collectionID))
    : inArray(entries.collectionID, collectionIDs);
  const rows = await tx
    .select({ id: entries.id })
    .from(entries)
    .where(and(eq(entries.workspaceID, workspaceID), isNull(entries.deletedAt), collectionFilter))
    .orderBy(asc(entries.id));

  return rows.map(({ id }) => id);
};
const getDisabledEntryIDs = async (
  tx: DatabaseTransaction,
  workspaceID: string,
  tree: PublishingTree,
  collectionID: string
): Promise<string[]> => {
  const subtreeCollectionIDs = new Set(getSubtreeCollectionIDs(tree, collectionID));
  const collectionIDs = new Set(
    tree.collections
      .filter((collection) => {
        return (
          subtreeCollectionIDs.has(collection.id) &&
          !isCollectionPublishingEnabled(tree, collection.id)
        );
      })
      .map((collection) => collection.id)
  );
  const includesRoot = collectionIDs.has(tree.rootID);

  if (collectionIDs.size === 0) return [];

  const collectionFilter = includesRoot
    ? or(inArray(entries.collectionID, [...collectionIDs]), isNull(entries.collectionID))
    : inArray(entries.collectionID, [...collectionIDs]);
  const rows = await tx
    .select({ id: entries.id })
    .from(entries)
    .where(and(eq(entries.workspaceID, workspaceID), isNull(entries.deletedAt), collectionFilter));

  return rows.map(({ id }) => id);
};

export {
  getDisabledEntryIDs,
  getSubtreeCollectionIDs,
  getSubtreeEntryIDs,
  isCollectionPublishingEnabled,
  loadPublishingTree
};
export type { PublishingTree };
