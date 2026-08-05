import { TREE_ROOT_ID } from "#web/components/tree";
import { createCollectionOperations } from "./collections";
import { createEntryOperations } from "./entries";
import { type ContentTree, type WorkspaceContentOperationsInput } from "./types";

const createWorkspaceContentOperations = (input: WorkspaceContentOperationsInput) => {
  const entryOperations = createEntryOperations(input);
  const collectionOperations = createCollectionOperations(input);
  const getContentTreeLevel = (ancestorID: string | null) => ({
    collections: () => collectionOperations.getCollectionsInParent(ancestorID),
    entries: () => entryOperations.getEntriesInCollection(ancestorID)
  });
  const splitContentIDs = (ids: string[]) => {
    const collectionIDs = collectionOperations.getCollectionIDs();

    return ids.reduce(
      (result, id) => {
        if (collectionIDs[id]) {
          result.collections.push(id);
        } else if (entryOperations.getEntry(id)) {
          result.entries.push(id);
        }

        return result;
      },
      { entries: [] as string[], collections: [] as string[] }
    );
  };
  const getDeletableContentIDs = (ids: string[]) => {
    const { entries, collections } = splitContentIDs(ids);
    const expandedCollectionIDs = collectionOperations.getCollectionDescendantIDs(collections);
    const nestedEntryIDs = collectionOperations.getEntryIDsInCollections(expandedCollectionIDs);

    return {
      entries: Array.from(new Set([...entries, ...nestedEntryIDs])),
      collections: expandedCollectionIDs
    };
  };
  const deleteContent = (ids: string[]) => {
    const { entries, collections } = splitContentIDs(ids);
    const expandedCollectionIDs = collectionOperations.getCollectionDescendantIDs(collections);
    const nestedEntryIDs = collectionOperations.getEntryIDsInCollections(expandedCollectionIDs);
    const nestedEntryIDSet = new Set(nestedEntryIDs);

    entryOperations.deleteEntries(entries.filter((id) => !nestedEntryIDSet.has(id)));
    collectionOperations.deleteCollections(expandedCollectionIDs);
  };
  const getContentTree = (): ContentTree => {
    const collections = collectionOperations.getVisibleCollections();
    const entries = input.entriesCollection().find().fetch();
    const rootCollection = collectionOperations.getRootCollection();
    const collectionsByID = new Map(collections.map((collection) => [collection.id, collection]));
    const collectionsByParent = new Map<string, typeof collections>();
    const entriesByParent = new Map<string, typeof entries>();
    const tree: ContentTree = {};

    for (const collection of collections) {
      const parentID = collectionOperations.getCollectionParentID(collection) ?? TREE_ROOT_ID;

      collectionsByParent.set(parentID, [...(collectionsByParent.get(parentID) ?? []), collection]);
      tree[collection.id] = {
        items: [],
        levels: []
      };
    }

    for (const entry of entries) {
      const parentID = entry.collectionID ?? TREE_ROOT_ID;

      entriesByParent.set(parentID, [...(entriesByParent.get(parentID) ?? []), entry]);
    }

    for (const levelID of new Set([
      TREE_ROOT_ID,
      ...collections.map((collection) => collection.id),
      ...collectionsByParent.keys(),
      ...entriesByParent.keys()
    ])) {
      const parentCollection =
        levelID === TREE_ROOT_ID ? rootCollection : collectionsByID.get(levelID);

      tree[levelID] = {
        levels: collectionOperations
          .sortCollections(collectionsByParent.get(levelID) ?? [], parentCollection?.descendants)
          .map((collection) => collection.id),
        items: entryOperations
          .sortEntries(entriesByParent.get(levelID) ?? [])
          .map((entry) => entry.id)
      };
    }

    return tree;
  };

  return {
    tree: {
      getLevel: ({ parentID }: { parentID: string | null }) => getContentTreeLevel(parentID),
      getMap: getContentTree,
      splitIDs: ({ ids }: { ids: string[] }) => splitContentIDs(ids),
      getDeletableIDs: ({ ids }: { ids: string[] }) => getDeletableContentIDs(ids),
      delete: ({ ids }: { ids: string[] }) => deleteContent(ids)
    },
    entries: {
      get: ({ entryID }: { entryID: string }) => entryOperations.getEntry(entryID),
      getInCollection: ({ collectionID }: { collectionID: string | null }) =>
        entryOperations.getEntriesInCollection(collectionID),
      getDropOrders: entryOperations.getEntryDropOrders,
      create: ({ collectionID }: { collectionID?: string } = {}) =>
        entryOperations.createEntry(collectionID),
      update: ({
        entryID,
        updates
      }: {
        entryID: string;
        updates: Parameters<typeof entryOperations.updateEntry>[1];
      }) => entryOperations.updateEntry(entryID, updates),
      delete: ({ entryIDs }: { entryIDs: string[] }) => entryOperations.deleteEntries(entryIDs)
    },
    collections: {
      get: ({ collectionID }: { collectionID: string }) =>
        collectionOperations.getCollection(collectionID),
      getIDs: collectionOperations.getCollectionIDs,
      getInParent: ({ parentID }: { parentID: string | null }) =>
        collectionOperations.getCollectionsInParent(parentID),
      getDropIndex: collectionOperations.getCollectionDropIndex,
      create: ({ parentID }: { parentID?: string } = {}) =>
        collectionOperations.createCollection(parentID),
      update: ({
        collectionID,
        updates
      }: {
        collectionID: string;
        updates: Parameters<typeof collectionOperations.updateCollection>[1];
      }) => collectionOperations.updateCollection(collectionID, updates),
      move: ({
        collectionID,
        parentID,
        index
      }: {
        collectionID: string;
        parentID: string | null;
        index?: number;
      }) => collectionOperations.moveCollection(collectionID, parentID, index),
      delete: ({ collectionIDs }: { collectionIDs: string[] }) =>
        collectionOperations.deleteCollections(collectionIDs)
    },
    sync: {
      entries: {
        applyCreate: ({
          entry
        }: {
          entry: Parameters<typeof entryOperations.applyEntryCreate>[0];
        }) => entryOperations.applyEntryCreate(entry),
        applyUpdate: ({
          entryID,
          updates
        }: {
          entryID: string;
          updates: Parameters<typeof entryOperations.applyEntryUpdate>[1];
        }) => entryOperations.applyEntryUpdate(entryID, updates),
        applyDelete: ({ entryIDs }: { entryIDs: string[] }) =>
          entryOperations.applyEntryDelete(entryIDs)
      },
      collections: {
        applyCreate: ({
          collection
        }: {
          collection: Parameters<typeof collectionOperations.applyCollectionCreate>[0];
        }) => collectionOperations.applyCollectionCreate(collection),
        applyUpdate: ({
          collectionID,
          updates
        }: {
          collectionID: string;
          updates: Parameters<typeof collectionOperations.applyCollectionUpdate>[1];
        }) => collectionOperations.applyCollectionUpdate(collectionID, updates),
        applyMove: ({
          collectionID,
          parentID,
          index
        }: {
          collectionID: string;
          parentID: string | null;
          index?: number;
        }) => collectionOperations.applyCollectionMove(collectionID, parentID, index),
        applyDelete: ({ collectionIDs }: { collectionIDs: string[] }) =>
          collectionOperations.applyCollectionDelete(collectionIDs)
      }
    }
  };
};

export { createWorkspaceContentOperations };
export type { ContentTree };
