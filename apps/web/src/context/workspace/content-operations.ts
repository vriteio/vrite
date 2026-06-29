import { Collection as LocalDBCollection } from "@signaldb/core";
import { Collection, Entry, client } from "#web/lib/client";
import { ObjectId } from "bson";
import { fromObjectID, toEntryID } from "#web/lib/id";
import { LexoRank } from "lexorank";
import { Accessor } from "solid-js";

interface WorkspaceContentOperationsInput {
  entriesCollection: Accessor<LocalDBCollection<Entry>>;
  collectionsCollection: Accessor<LocalDBCollection<Collection>>;
}

const createWorkspaceContentOperations = (input: WorkspaceContentOperationsInput) => {
  const { entriesCollection, collectionsCollection } = input;
  const getContentTreeLevel = (ancestorID: string | null) => {
    const collections = () => {
      return collectionsCollection()
        .find({
          ...(ancestorID === null
            ? { ancestors: { $size: 0 } }
            : {
                $and: [
                  { "ancestors.0": { $exists: true } },
                  {
                    $expr: {
                      $eq: [{ $last: "$ancestors" }, ancestorID]
                    }
                  }
                ]
              })
        })
        .fetch();
    };
    const entries = () => {
      return entriesCollection()
        .find(
          {
            ...(ancestorID === null
              ? { collectionID: { $exists: false } }
              : { collectionID: ancestorID })
          },
          {
            sort: {
              order: -1
            }
          }
        )
        .fetch();
    };

    return { collections, entries };
  };
  const getCollection = (id: string) => {
    return collectionsCollection().findOne({ id });
  };
  const getEntry = (id: string) => {
    return entriesCollection().findOne({ id });
  };
  const createEntry = async (collectionID?: string): Promise<Entry | undefined> => {
    const entries = entriesCollection();
    const entry: Entry = {
      id: toEntryID(new ObjectId()),
      order: `${LexoRank.min()}`,
      name: "Untitled",
      collectionID
    };

    entries.insert(entry);

    try {
      // TODO: Improve ID handling
      const createdEntry = await client.entries.create(entry);

      entries.batch(() => {
        entries.removeOne({ id: entry.id });
        entries.replaceOne({ id: createdEntry.id }, createdEntry, { upsert: true });
      });

      return createdEntry;
    } catch (error) {
      entries.removeOne({ id: entry.id });
    }
  };
  const createCollection = async (collectionID?: string): Promise<Collection | undefined> => {
    const collections = collectionsCollection();
    const collection: Collection = {
      id: fromObjectID(new ObjectId(), "coll"),
      name: "Untitled",
      descendants: [],
      ancestors: collectionID
        ? [...(getCollection(collectionID)?.ancestors || []), collectionID]
        : []
    };

    collections.insert(collection);

    try {
      const createdCollection = await client.collections.create(collection);

      collections.batch(() => {
        collections.removeOne({ id: collection.id });
        collections.replaceOne({ id: createdCollection.id }, createdCollection, { upsert: true });
      });

      return createdCollection;
    } catch (error) {
      collections.removeOne({ id: collection.id });
    }
  };
  const updateCollection = (collectionID: string, props: Partial<Collection>) => {
    const collections = collectionsCollection();
    const original = collections.findOne({ id: collectionID });

    if (!original) return;

    const updated = { ...original, ...props };
    const apiCalls: Array<Promise<unknown>> = [];

    if ("name" in props) {
      apiCalls.push(client.collections.update({ id: collectionID, name: updated.name }));
    }

    if ("ancestors" in props) {
      apiCalls.push(
        client.collections.move({
          id: collectionID,
          newParentID: updated.ancestors.at(-1) ?? null
        })
      );
    }

    if (apiCalls.length === 0) return;

    collections.updateOne({ id: collectionID }, { $set: props });

    Promise.all(apiCalls).catch(() => {
      collections.replaceOne({ id: collectionID }, original, { upsert: true });
    });
  };
  const updateEntry = (entryID: string, props: Partial<Entry>) => {
    const entries = entriesCollection();
    const original = entries.findOne({ id: entryID });

    if (!original) return;

    const updated = { ...original, ...props };
    const apiCalls: Array<Promise<unknown>> = [];

    if ("name" in props) {
      apiCalls.push(client.entries.update({ id: entryID, name: updated.name }));
    }

    if ("order" in props || "collectionID" in props) {
      apiCalls.push(
        client.entries.move({
          id: entryID,
          order: updated.order,
          collectionID: updated.collectionID ?? null
        })
      );
    }

    if (apiCalls.length === 0) return;

    entries.updateOne({ id: entryID }, { $set: props });

    Promise.all(apiCalls).catch(() => {
      entries.replaceOne({ id: entryID }, original, { upsert: true });
    });
  };
  const deleteCollections = (collectionIDs: string[]) => {
    if (collectionIDs.length === 0) return;

    const collections = collectionsCollection();
    const deletedCollections = collectionIDs.flatMap((id) => {
      const collection = collections.findOne({ id });

      return collection ? [collection] : [];
    });

    collections.removeMany({ id: { $in: collectionIDs } });

    try {
      client.collections.delete({ ids: collectionIDs });
    } catch (error) {
      collections.batch(() => {
        for (const collection of deletedCollections) {
          collections.replaceOne({ id: collection.id }, collection, { upsert: true });
        }
      });
    }
  };
  const deleteEntries = (entryIDs: string[]) => {
    if (entryIDs.length === 0) return;

    const entries = entriesCollection();
    const deletedEntries = entryIDs.flatMap((id) => {
      const entry = entries.findOne({ id });

      return entry ? [entry] : [];
    });

    entries.removeMany({ id: { $in: entryIDs } });

    try {
      client.entries.delete({ ids: entryIDs });
    } catch (error) {
      entries.batch(() => {
        for (const entry of deletedEntries) {
          entries.replaceOne({ id: entry.id }, entry, { upsert: true });
        }
      });
    }
  };

  return {
    getContentTreeLevel,
    getCollection,
    getEntry,
    createEntry,
    createCollection,
    updateCollection,
    updateEntry,
    deleteCollections,
    deleteEntries
  };
};

export { createWorkspaceContentOperations };
