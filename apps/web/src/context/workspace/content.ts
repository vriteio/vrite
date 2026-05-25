import { Collection as LocalDBCollection } from "@signaldb/core";
import { createIndexedDBAdapter } from "./persistence";
import { Collection, Entry, client } from "#web/lib/client";
import solidReactivityAdapter from "@signaldb/solid";
import { useConnectivitySignal } from "@solid-primitives/connectivity";
import { ObjectId } from "bson";
import { toEntryID } from "#web/lib/id";
import { LexoRank } from "lexorank";
import { Accessor } from "solid-js";
import { createAsync, query } from "@solidjs/router";

const explorerTreeQuery = query(async () => {
  const explorerTree = await client.sync.getExplorerTree();

  return explorerTree;
}, "explorerTree");
const useWorkspaceContent = (workspaceID: Accessor<string>) => {
  const explorerTree = createAsync(() => explorerTreeQuery());
  const entriesCollection = new LocalDBCollection<Entry>({
    persistence: createIndexedDBAdapter("entries", {
      databaseName: "andesine",
      prefix: "",
      storeName: "entries"
    }),
    reactivity: solidReactivityAdapter
  });
  const collectionsCollection = new LocalDBCollection<Collection>({
    persistence: createIndexedDBAdapter("collections", {
      databaseName: "andesine",
      prefix: "",
      storeName: "collections"
    }),
    reactivity: solidReactivityAdapter
  });
  const getContentTreeLevel = (ancestorID: string | null) => {
    const collections = () => {
      return collectionsCollection
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
      return entriesCollection
        .find({
          ...(ancestorID === null
            ? { collectionID: { $exists: false } }
            : { collectionID: ancestorID })
        })
        .fetch();
    };

    return { collections, entries };
  };
  const isOnline = useConnectivitySignal();
  const readOnly = () => !isOnline();
  const loading = () => false;
  const getCollection = (id: string) => {
    return collectionsCollection.findOne({ id });
  };
  const getEntry = (id: string) => {
    return entriesCollection.findOne({ id });
  };
  const createEntry = (collectionID?: string): Entry => {
    const entry: Entry = {
      id: toEntryID(new ObjectId()),
      order: `${LexoRank.min()}`,
      name: "Untitled",
      collectionID
    };
    entriesCollection.insert(entry);
    client.entries.create(entry).catch((error) => {
      entriesCollection.removeOne({ id: entry.id });
    });

    return entry;
  };
  const createCollection = (collectionID?: string): Collection => {
    const collection: Collection = {
      id: toEntryID(new ObjectId()),
      name: "Untitled",
      descendants: [],
      ancestors: collectionID
        ? [...(getCollection(collectionID)?.ancestors || []), collectionID]
        : []
    };

    collectionsCollection.insert(collection);
    client.collections.create(collection).catch((error) => {
      collectionsCollection.removeOne({ id: collection.id });
    });

    return collection;
  };
  const updateCollection = (collectionID: string, props: Partial<Collection>) => {
    const original = getCollection(collectionID);
    if (!original) return;

    const updated = { ...original, ...props };
    collectionsCollection.updateOne({ id: collectionID }, { $set: props });
    client.collections.update(updated).catch((error) => {
      collectionsCollection.updateOne({ id: collectionID }, { $set: original });
    });
  };
  const updateEntry = (entryID: string, props: Partial<Entry>) => {
    const original = getEntry(entryID);

    if (!original) return;

    const updated = { ...original, ...props };

    entriesCollection.updateOne({ id: entryID }, { $set: props });
    client.entries.update(updated).catch((error) => {
      entriesCollection.updateOne({ id: entryID }, { $set: original });
    });
  };
  const deleteCollections = (collectionIDs: string[]) => {};
  const deleteEntries = (entryIDs: string[]) => {};

  return {
    entriesCollection,
    collectionsCollection,
    loading,
    readOnly,
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

export { useWorkspaceContent };
