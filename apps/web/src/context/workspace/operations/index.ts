import { TREE_ROOT_ID } from "#web/components/tree";
import { createCollectionOperations } from "./collections";
import { createEntryOperations } from "./entries";
import { ContentTree, WorkspaceContentOperationsInput } from "./types";

const createWorkspaceContentOperations = (input: WorkspaceContentOperationsInput) => {
  const entryOperations = createEntryOperations(input);
  const collectionOperations = createCollectionOperations(input);
  const getContentTreeLevel = (ancestorID: string | null) => {
    return {
      collections: () => collectionOperations.getCollectionsInParent(ancestorID),
      entries: () => entryOperations.getEntriesInCollection(ancestorID)
    };
  };
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
        levelID === TREE_ROOT_ID
          ? rootCollection
          : collectionsByID.get(levelID);

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
    getContentTreeLevel,
    getContentTree,
    splitContentIDs,
    getDeletableContentIDs,
    deleteContent,
    ...entryOperations,
    ...collectionOperations
  };
};

export { createWorkspaceContentOperations };
export type { ContentTree };
