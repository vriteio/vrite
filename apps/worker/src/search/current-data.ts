import { collections } from "@andesine/backend/db/collections";
import { contents } from "@andesine/backend/db/contents";
import { entries } from "@andesine/backend/db/entries";
import type { CurrentSearchDocumentSource } from "@andesine/backend/lib/search";
import { toCollectionID, toEntryID, toUUID } from "@andesine/backend/lib/primitives";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../database";

interface CollectionDetails {
  id: string;
  name: string;
  parentID: string | null;
  restricted: boolean;
}

interface CurrentEntrySourceInput {
  entryID: string;
  workspaceID: string;
}

interface CurrentCollectionEntryIDsInput {
  collectionID: string;
  workspaceID: string;
}

const loadCollections = async (workspaceID: string): Promise<CollectionDetails[]> => {
  return db
    .select({
      id: collections.id,
      name: collections.name,
      parentID: collections.parentID,
      restricted: collections.restricted
    })
    .from(collections)
    .where(and(eq(collections.workspaceID, toUUID(workspaceID)), isNull(collections.deletedAt)));
};
const getCollectionLineage = (
  collectionID: string | null,
  collectionByID: Map<string, CollectionDetails>,
  root: CollectionDetails
): CollectionDetails[] => {
  const lineage: CollectionDetails[] = [];
  let collection = collectionID ? collectionByID.get(collectionID) : root;

  while (collection) {
    lineage.unshift(collection);
    collection = collection.parentID ? collectionByID.get(collection.parentID) : undefined;
  }

  return lineage;
};
const loadCurrentEntrySource = async (
  input: CurrentEntrySourceInput
): Promise<CurrentSearchDocumentSource | null> => {
  const workspaceID = toUUID(input.workspaceID);
  const [collectionRows, entryRows] = await Promise.all([
    loadCollections(input.workspaceID),
    db
      .select({
        id: entries.id,
        collectionID: entries.collectionID,
        name: entries.name,
        document: contents.document,
        updatedAt: contents.updatedAt
      })
      .from(entries)
      .innerJoin(contents, eq(contents.entryID, entries.id))
      .where(
        and(
          eq(entries.id, toUUID(input.entryID)),
          eq(entries.workspaceID, workspaceID),
          isNull(entries.deletedAt)
        )
      )
      .limit(1)
  ]);
  const entry = entryRows[0];
  const root = collectionRows.find((collection) => collection.parentID === null);

  if (!entry || !root) return null;

  const collectionByID = new Map(collectionRows.map((collection) => [collection.id, collection]));
  const lineage = getCollectionLineage(entry.collectionID, collectionByID, root);
  const sourceCollection = lineage[lineage.length - 1] || root;
  const visibleLineage = lineage.filter((collection) => collection.parentID !== null);

  return {
    scope: "current",
    workspaceID: input.workspaceID,
    entryID: toEntryID(entry.id),
    collectionID: toCollectionID(sourceCollection.id),
    ancestorCollectionIDs: visibleLineage
      .slice(0, -1)
      .map((collection) => toCollectionID(collection.id)),
    restrictedBoundaryIDs: visibleLineage
      .filter((collection) => collection.restricted)
      .map((collection) => toCollectionID(collection.id)),
    collectionPath: visibleLineage.map((collection) => collection.name),
    title: entry.name,
    content: entry.document || { type: "doc", content: [] },
    updatedAt: entry.updatedAt
  };
};
const loadCurrentCollectionEntryIDs = async (
  input: CurrentCollectionEntryIDsInput
): Promise<string[]> => {
  const collectionRows = await loadCollections(input.workspaceID);
  const collectionID = toUUID(input.collectionID);
  const childIDsByParentID = new Map<string, string[]>();

  for (const collection of collectionRows) {
    if (!collection.parentID) continue;

    const childIDs = childIDsByParentID.get(collection.parentID) || [];

    childIDs.push(collection.id);
    childIDsByParentID.set(collection.parentID, childIDs);
  }

  const subtreeIDs = new Set<string>();
  const pendingIDs = [collectionID];

  while (pendingIDs.length > 0) {
    const currentID = pendingIDs.pop();

    if (!currentID || subtreeIDs.has(currentID)) continue;

    subtreeIDs.add(currentID);
    pendingIDs.push(...(childIDsByParentID.get(currentID) || []));
  }

  if (subtreeIDs.size === 0) return [];

  const rows = await db
    .select({ id: entries.id })
    .from(entries)
    .where(
      and(
        eq(entries.workspaceID, toUUID(input.workspaceID)),
        inArray(entries.collectionID, [...subtreeIDs]),
        isNull(entries.deletedAt)
      )
    );

  return rows.map(({ id }) => toEntryID(id));
};

export {
  getCollectionLineage,
  loadCollections,
  loadCurrentCollectionEntryIDs,
  loadCurrentEntrySource
};
export type { CollectionDetails };
