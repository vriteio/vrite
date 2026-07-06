import { Collection, client } from "#web/lib/client";
import { fromObjectID } from "#web/lib/id";
import { ObjectId } from "bson";
import { ROOT_COLLECTION_NAME, WorkspaceContentOperationsInput } from "./types";
import { untrack } from "solid-js";

const createCollectionOperations = (input: WorkspaceContentOperationsInput) => {
  const { collectionsCollection, entriesCollection } = input;
  const pendingCreates = new Map<string, Promise<unknown>>();
  const isRootCollection = (collection: Collection) => {
    return collection.name === ROOT_COLLECTION_NAME && collection.ancestors.length === 0;
  };
  const getRootCollection = () => {
    return untrack(() =>
      collectionsCollection().findOne({ name: ROOT_COLLECTION_NAME, ancestors: { $size: 0 } })
    );
  };
  const getVisibleCollections = () => {
    return collectionsCollection()
      .find()
      .fetch()
      .filter((collection) => !isRootCollection(collection));
  };
  const sortCollections = (collections: Collection[], orderedIDs?: string[]) => {
    const fallbackCompare = (a: Collection, b: Collection) => {
      return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    };

    if (!orderedIDs?.length) {
      return [...collections].sort(fallbackCompare);
    }

    const orderMap = new Map(orderedIDs.map((id, index) => [id, index]));

    return [...collections].sort((a, b) => {
      const aIndex = orderMap.get(a.id);
      const bIndex = orderMap.get(b.id);

      if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex;
      if (aIndex !== undefined) return -1;
      if (bIndex !== undefined) return 1;

      return fallbackCompare(a, b);
    });
  };
  const getCollectionParentID = (collection: Collection) => {
    return collection.ancestors.at(-1) ?? null;
  };
  const getCollectionsInParent = (parentID: string | null) => {
    const childCollections = getVisibleCollections().filter((collection) => {
      return getCollectionParentID(collection) === parentID;
    });
    const parent = parentID ? getCollection(parentID) : getRootCollection();

    return sortCollections(childCollections, parent?.descendants);
  };
  const getCollectionDropIndex = (input: {
    parentID: string | null;
    targetCollectionID?: string;
    edge?: "top" | "bottom" | null;
    collectionIDs: string[];
  }) => {
    const movingCollectionIDs = new Set(input.collectionIDs);
    const siblings = getCollectionsInParent(input.parentID).filter((collection) => {
      return !movingCollectionIDs.has(collection.id);
    });
    const targetIndex = input.targetCollectionID
      ? siblings.findIndex((collection) => collection.id === input.targetCollectionID)
      : -1;

    if (targetIndex === -1) {
      return siblings.length;
    }

    return input.edge === "bottom" ? targetIndex + 1 : targetIndex;
  };
  const getCollectionIDs = () => {
    return Object.fromEntries(getVisibleCollections().map((collection) => [collection.id, true]));
  };
  const getCollection = (id: string) => {
    const collection = untrack(() => collectionsCollection().findOne({ id }));

    return collection && !isRootCollection(collection) ? collection : undefined;
  };
  const getCollectionDescendantIDs = (collectionIDs: string[]) => {
    const selectedIDs = new Set(collectionIDs);
    const visibleCollections = getVisibleCollections();
    let changed = true;

    while (changed) {
      changed = false;

      for (const collection of visibleCollections) {
        if (selectedIDs.has(collection.id)) continue;

        if (collection.ancestors.some((ancestorID) => selectedIDs.has(ancestorID))) {
          selectedIDs.add(collection.id);
          changed = true;
        }
      }
    }

    return visibleCollections
      .filter((collection) => selectedIDs.has(collection.id))
      .map((collection) => collection.id);
  };
  const getEntryIDsInCollections = (collectionIDs: string[]) => {
    const collectionIDSet = new Set(collectionIDs);

    return entriesCollection()
      .find()
      .fetch()
      .filter((entry) => entry.collectionID && collectionIDSet.has(entry.collectionID))
      .map((entry) => entry.id);
  };
  const replaceParentDescendant = (parentID: string | null, fromID: string, toID?: string) => {
    const parent = parentID
      ? collectionsCollection().findOne({ id: parentID })
      : getRootCollection();

    if (!parent) return;

    collectionsCollection().updateOne(
      { id: parent.id },
      {
        $set: {
          descendants: parent.descendants.flatMap((id) => {
            if (id !== fromID) return [id];

            return toID ? [toID] : [];
          })
        }
      }
    );
  };
  const createCollection = (collectionID?: string): Collection | undefined => {
    const collections = collectionsCollection();
    const parent = collectionID ? getCollection(collectionID) : getRootCollection();
    const collection: Collection = {
      id: fromObjectID(new ObjectId(), "coll"),
      name: "Untitled",
      descendants: [],
      ancestors: collectionID ? [...(parent?.ancestors || []), collectionID] : []
    };

    collections.insert(collection);

    if (parent) {
      collections.updateOne(
        { id: parent.id },
        {
          $set: {
            descendants: [...parent.descendants, collection.id]
          }
        }
      );
    }

    const createRequest = client.collections
      .create(collection)
      .then((createdCollection) => {
        const currentCollection = collections.findOne({ id: collection.id });

        collections.replaceOne(
          { id: collection.id },
          {
            ...createdCollection,
            ...(currentCollection && {
              name: currentCollection.name,
              ancestors: currentCollection.ancestors,
              descendants: currentCollection.descendants
            })
          },
          { upsert: true }
        );
      });

    pendingCreates.set(collection.id, createRequest);
    createRequest
      .catch(() => {
        collections.removeOne({ id: collection.id });
        replaceParentDescendant(collectionID ?? null, collection.id);
      })
      .finally(() => {
        pendingCreates.delete(collection.id);
      });

    return collection;
  };
  const updateCollection = (collectionID: string, props: Partial<Collection>) => {
    const collections = collectionsCollection();
    const original = getCollection(collectionID);

    if (!original) return;

    const updated = { ...original, ...props };
    const apiCalls: Array<Promise<unknown>> = [];
    const afterCreate = <T,>(request: () => Promise<T>) => {
      const pendingCreate = pendingCreates.get(collectionID);

      return pendingCreate ? pendingCreate.then(request) : request();
    };

    if ("name" in props) {
      apiCalls.push(
        afterCreate(() => client.collections.update({ id: collectionID, name: updated.name }))
      );
    }

    if ("ancestors" in props) {
      apiCalls.push(
        afterCreate(() =>
          client.collections.move({
            id: collectionID,
            newParentID: updated.ancestors.at(-1) ?? null
          })
        )
      );
    }

    if (apiCalls.length === 0) return;

    collections.updateOne({ id: collectionID }, { $set: props });

    Promise.all(apiCalls).catch(() => {
      if (!collections.findOne({ id: collectionID })) return;

      collections.replaceOne({ id: collectionID }, original, { upsert: true });
    });
  };
  const moveCollection = (collectionID: string, newParentID: string | null, index?: number) => {
    const collections = collectionsCollection();
    const original = getCollection(collectionID);
    const newParent = newParentID ? getCollection(newParentID) : getRootCollection();

    if (!original) return;
    if (newParentID === collectionID) return;
    if (!newParent) return;
    if (newParent.ancestors.includes(collectionID)) return;

    const previousParentID = original.ancestors.at(-1) ?? null;
    const previousParent = previousParentID
      ? collections.findOne({ id: previousParentID })
      : getRootCollection();
    const newAncestors = newParentID ? [...newParent.ancestors, newParentID] : [];
    const descendants = getVisibleCollections().filter((collection) => {
      return collection.ancestors.includes(collectionID);
    });
    const originals = [
      original,
      ...(previousParent ? [previousParent] : []),
      ...(newParent.id !== previousParent?.id ? [newParent] : []),
      ...descendants
    ];

    collections.batch(() => {
      if (previousParent) {
        collections.updateOne(
          { id: previousParent.id },
          {
            $set: {
              descendants: previousParent.descendants.filter((id) => id !== collectionID)
            }
          }
        );
      }

      const nextDescendants = newParent.descendants.filter((id) => id !== collectionID);
      const nextIndex = Math.min(
        Math.max(index ?? nextDescendants.length, 0),
        nextDescendants.length
      );

      nextDescendants.splice(nextIndex, 0, collectionID);
      collections.updateOne(
        { id: newParent.id },
        {
          $set: {
            descendants: nextDescendants
          }
        }
      );
      collections.updateOne(
        { id: collectionID },
        {
          $set: {
            ancestors: newAncestors
          }
        }
      );

      const oldPrefix = [...original.ancestors, collectionID];
      const newPrefix = [...newAncestors, collectionID];

      for (const descendant of descendants) {
        const updatedAncestors = [...newPrefix, ...descendant.ancestors.slice(oldPrefix.length)];

        collections.updateOne(
          { id: descendant.id },
          {
            $set: {
              ancestors: updatedAncestors
            }
          }
        );
      }
    });

    client.collections
      .move({
        id: collectionID,
        newParentID,
        index
      })
      .catch(() => {
        collections.batch(() => {
          for (const item of originals) {
            collections.replaceOne({ id: item.id }, item, { upsert: true });
          }
        });
      });
  };
  const deleteCollections = (collectionIDs: string[]) => {
    if (collectionIDs.length === 0) return;

    const collections = collectionsCollection();
    const entries = entriesCollection();
    const deletedCollectionIDs = getCollectionDescendantIDs(collectionIDs);
    const deletedCollectionIDSet = new Set(deletedCollectionIDs);
    const deletedEntryIDs = getEntryIDsInCollections(deletedCollectionIDs);
    const deletedCollections = deletedCollectionIDs.flatMap((id) => {
      const collection = getCollection(id);

      return collection ? [collection] : [];
    });
    const deletedEntries = deletedEntryIDs.flatMap((id) => {
      const entry = entries.findOne({ id });

      return entry ? [entry] : [];
    });
    const affectedParents = getVisibleCollections()
      .filter((collection) => {
        return collection.descendants.some((id) => deletedCollectionIDSet.has(id));
      })
      .map((collection) => ({ ...collection }));
    const rootCollection = getRootCollection();
    const originalRootCollection = rootCollection ? { ...rootCollection } : undefined;

    collections.batch(() => {
      entries.removeMany({ id: { $in: deletedEntryIDs } });
      collections.removeMany({ id: { $in: deletedCollectionIDs } });

      for (const parent of affectedParents) {
        collections.updateOne(
          { id: parent.id },
          {
            $set: {
              descendants: parent.descendants.filter((id) => !deletedCollectionIDSet.has(id))
            }
          }
        );
      }

      if (rootCollection) {
        collections.updateOne(
          { id: rootCollection.id },
          {
            $set: {
              descendants: rootCollection.descendants.filter((id) => !deletedCollectionIDSet.has(id))
            }
          }
        );
      }
    });

    client.collections.delete({ ids: deletedCollectionIDs }).catch(() => {
      collections.batch(() => {
        if (originalRootCollection) {
          collections.replaceOne(
            { id: originalRootCollection.id },
            originalRootCollection,
            { upsert: true }
          );
        }

        for (const parent of affectedParents) {
          collections.replaceOne({ id: parent.id }, parent, { upsert: true });
        }

        for (const collection of deletedCollections) {
          collections.replaceOne({ id: collection.id }, collection, { upsert: true });
        }

        for (const entry of deletedEntries) {
          entries.replaceOne({ id: entry.id }, entry, { upsert: true });
        }
      });
    });
  };

  return {
    isRootCollection,
    getRootCollection,
    getVisibleCollections,
    sortCollections,
    getCollectionParentID,
    getCollectionsInParent,
    getCollectionDropIndex,
    getCollectionIDs,
    getCollection,
    getCollectionDescendantIDs,
    getEntryIDsInCollections,
    createCollection,
    updateCollection,
    moveCollection,
    deleteCollections
  };
};

export { createCollectionOperations };
