import { type Collection, client } from "#web/lib/api";
import { fromUUID, generateUUID } from "#web/lib/primitives";
import { type WorkspaceContentOperationsInput } from "./types";
import { createCollectionQueries } from "./collection-queries";

const createCollectionOperations = (input: WorkspaceContentOperationsInput) => {
  const { collectionsCollection, entriesCollection } = input;
  const pendingCreates = new Map<string, Promise<unknown>>();
  const queries = createCollectionQueries(input);
  const {
    getCollection,
    getCollectionDescendantIDs,
    getEntryIDsInCollections,
    getRootCollection,
    getVisibleCollections
  } = queries;
  const applyCollectionCreate = (collection: Collection) => {
    const collections = collectionsCollection();
    const current = collections.findOne({ id: collection.id });
    const parentID = collection.ancestors.at(-1) ?? null;
    const parent = parentID ? collections.findOne({ id: parentID }) : getRootCollection();

    collections.batch(() => {
      collections.replaceOne(
        { id: collection.id },
        { ...collection, ...(current || {}) },
        { upsert: true }
      );

      if (parent && !parent.descendants.includes(collection.id)) {
        collections.updateOne(
          { id: parent.id },
          { $set: { descendants: [...parent.descendants, collection.id] } }
        );
      }
    });
  };
  const applyCollectionUpdate = (collectionID: string, props: Partial<Collection>) => {
    collectionsCollection().updateOne({ id: collectionID }, { $set: props });
  };
  const applyCollectionDelete = (collectionIDs: string[]) => {
    const collections = collectionsCollection();
    const deletedIDs = new Set(collectionIDs);

    collections.batch(() => {
      entriesCollection().removeMany({ collectionID: { $in: collectionIDs } });
      collections.removeMany({ id: { $in: collectionIDs } });

      for (const collection of collections.find().fetch()) {
        if (collection.descendants.some((id) => deletedIDs.has(id))) {
          applyCollectionUpdate(collection.id, {
            descendants: collection.descendants.filter((id) => !deletedIDs.has(id))
          });
        }
      }
    });
  };
  const createCollection = (collectionID?: string): Collection | undefined => {
    const parent = collectionID ? getCollection(collectionID) : getRootCollection();
    const collection: Collection = {
      id: fromUUID(generateUUID(), "coll"),
      name: "Untitled",
      restricted: false,
      descendants: [],
      ancestors: collectionID ? [...(parent?.ancestors || []), collectionID] : []
    };

    applyCollectionCreate(collection);

    const createRequest = client.collections
      .create({
        id: collection.id,
        name: collection.name,
        parentID: collectionID
      })
      .then((createdCollection) => {
        applyCollectionCreate(createdCollection);
      });

    pendingCreates.set(collection.id, createRequest);
    createRequest
      .catch(() => {
        applyCollectionDelete([collection.id]);
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
    const afterCreate = <T>(request: () => Promise<T>) => {
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

    applyCollectionUpdate(collectionID, props);

    Promise.all(apiCalls).catch(() => {
      if (!collections.findOne({ id: collectionID })) return;

      collections.replaceOne({ id: collectionID }, original, { upsert: true });
    });
  };
  const setCollectionRestricted = async (collectionID: string, restricted: boolean) => {
    const collection = getCollection(collectionID);

    if (!collection) return;

    applyCollectionUpdate(collectionID, { restricted });

    try {
      await client.collections.setRestricted({ id: collectionID, restricted });
    } catch (error) {
      applyCollectionUpdate(collectionID, { restricted: collection.restricted });
      throw error;
    }
  };
  const applyCollectionMove = (
    collectionID: string,
    newParentID: string | null,
    index?: number
  ) => {
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

    return originals;
  };
  const moveCollection = (
    collectionID: string,
    newParentID: string | null,
    index?: number,
    confirmedDataLoss?: boolean
  ) => {
    const collections = collectionsCollection();
    const originals = applyCollectionMove(collectionID, newParentID, index);

    if (!originals) return Promise.resolve(undefined);

    return client.collections
      .move({
        id: collectionID,
        newParentID,
        index,
        confirmedDataLoss
      })
      .catch((error) => {
        collections.batch(() => {
          for (const item of originals) {
            collections.replaceOne({ id: item.id }, item, { upsert: true });
          }
        });

        throw error;
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

    applyCollectionDelete(deletedCollectionIDs);

    client.collections.bulkDelete({ ids: deletedCollectionIDs }).catch(() => {
      collections.batch(() => {
        if (originalRootCollection) {
          collections.replaceOne({ id: originalRootCollection.id }, originalRootCollection, {
            upsert: true
          });
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
    ...queries,
    applyCollectionCreate,
    applyCollectionUpdate,
    applyCollectionDelete,
    createCollection,
    updateCollection,
    setCollectionRestricted,
    applyCollectionMove,
    moveCollection,
    deleteCollections
  };
};

export { createCollectionOperations };
