import { type Collection } from "#web/lib/api";
import { untrack } from "solid-js";
import { ROOT_COLLECTION_NAME, type WorkspaceContentOperationsInput } from "./types";

const createCollectionQueries = (input: WorkspaceContentOperationsInput) => {
  const { collectionsCollection, entriesCollection } = input;
  const isRootCollection = (collection: Collection) =>
    collection.name === ROOT_COLLECTION_NAME && collection.ancestors.length === 0;
  const getRootCollection = () => {
    return untrack(() => {
      return collectionsCollection().findOne({
        name: ROOT_COLLECTION_NAME,
        ancestors: { $size: 0 }
      });
    });
  };
  const getVisibleCollections = () =>
    collectionsCollection()
      .find()
      .fetch()
      .filter((collection) => !isRootCollection(collection));
  const sortCollections = (collections: Collection[], orderedIDs?: string[]) => {
    const fallback = (a: Collection, b: Collection) =>
      a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    if (!orderedIDs?.length) return [...collections].sort(fallback);

    const order = new Map(orderedIDs.map((id, index) => [id, index]));
    return [...collections].sort((a, b) => {
      const aIndex = order.get(a.id);
      const bIndex = order.get(b.id);
      if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex;
      if (aIndex !== undefined) return -1;
      if (bIndex !== undefined) return 1;
      return fallback(a, b);
    });
  };
  const getCollectionParentID = (collection: Collection) => collection.ancestors.at(-1) ?? null;
  const getCollection = (id: string) => {
    const collection = untrack(() => collectionsCollection().findOne({ id }));
    return collection && !isRootCollection(collection) ? collection : undefined;
  };
  const getCollectionsInParent = (parentID: string | null) => {
    const children = getVisibleCollections().filter(
      (collection) => getCollectionParentID(collection) === parentID
    );
    const parent = parentID ? getCollection(parentID) : getRootCollection();
    return sortCollections(children, parent?.descendants);
  };
  const getCollectionIDs = () =>
    Object.fromEntries(getVisibleCollections().map((collection) => [collection.id, true]));
  const getCollectionDescendantIDs = (collectionIDs: string[]) => {
    const selected = new Set(collectionIDs);
    const collections = getVisibleCollections();
    let changed = true;
    while (changed) {
      changed = false;
      for (const collection of collections) {
        if (!selected.has(collection.id) && collection.ancestors.some((id) => selected.has(id))) {
          selected.add(collection.id);
          changed = true;
        }
      }
    }
    return collections.filter((collection) => selected.has(collection.id)).map(({ id }) => id);
  };
  const getEntryIDsInCollections = (collectionIDs: string[]) => {
    const ids = new Set(collectionIDs);
    return entriesCollection()
      .find()
      .fetch()
      .filter((entry) => entry.collectionID && ids.has(entry.collectionID))
      .map(({ id }) => id);
  };
  const getCollectionDropIndex = (drop: {
    parentID: string | null;
    targetCollectionID?: string;
    edge?: "top" | "bottom" | null;
    collectionIDs: string[];
  }) => {
    const moving = new Set(drop.collectionIDs);
    const siblings = getCollectionsInParent(drop.parentID).filter(({ id }) => !moving.has(id));
    const index = drop.targetCollectionID
      ? siblings.findIndex(({ id }) => id === drop.targetCollectionID)
      : -1;
    return index === -1 ? siblings.length : drop.edge === "bottom" ? index + 1 : index;
  };

  return {
    getCollection,
    getCollectionDescendantIDs,
    getCollectionDropIndex,
    getCollectionIDs,
    getCollectionParentID,
    getCollectionsInParent,
    getEntryIDsInCollections,
    getRootCollection,
    getVisibleCollections,
    isRootCollection,
    sortCollections
  };
};

export { createCollectionQueries };
