import { Collection as LocalDBCollection } from "@signaldb/core";
import { createWorkspaceContentOperations } from "./content-operations";
import { createIndexedDBAdapter, deleteIndexedDBDatabase } from "./persistence";
import { Collection, Entry, client } from "#web/lib/client";
import solidReactivityAdapter from "@signaldb/solid";
import { useConnectivitySignal } from "@solid-primitives/connectivity";
import { Accessor, createEffect, createSignal, on } from "solid-js";
import { createAsync, query } from "@solidjs/router";

const explorerTreeQuery = query(async (workspaceID?: string) => {
  if (!workspaceID) {
    return { collections: [], entries: [] };
  }

  const explorerTree = await client.sync.getExplorerTree();

  return explorerTree;
}, "explorerTree");
const getWorkspaceContentDatabaseName = (workspaceID?: string) => {
  return `andesine:${workspaceID || "ephemeral"}`;
};
const createWorkspaceCollections = (workspaceID?: string) => {
  const databaseName = getWorkspaceContentDatabaseName(workspaceID);
  const storeNames = ["entries", "collections"];
  const entries = new LocalDBCollection<Entry>({
    name: `${databaseName}:entries`,
    persistence: workspaceID
      ? createIndexedDBAdapter("entries", {
          databaseName,
          storeName: "entries",
          stores: storeNames
        })
      : undefined,
    reactivity: solidReactivityAdapter
  });
  const collections = new LocalDBCollection<Collection>({
    name: `${databaseName}:collections`,
    persistence: workspaceID
      ? createIndexedDBAdapter("collections", {
          databaseName,
          storeName: "collections",
          stores: storeNames
        })
      : undefined,
    reactivity: solidReactivityAdapter
  });

  return { workspaceID, entries, collections };
};
const clearWorkspaceContent = async (workspaceID: string) => {
  await deleteIndexedDBDatabase(getWorkspaceContentDatabaseName(workspaceID));
};
const useWorkspaceContent = (workspaceID: Accessor<string>) => {
  const explorerTree = createAsync(() => {
    return explorerTreeQuery(workspaceID());
  });
  const isOnline = useConnectivitySignal();
  const [contentCollections, setContentCollections] = createSignal(createWorkspaceCollections());
  const entriesCollection = () => contentCollections().entries;
  const collectionsCollection = () => contentCollections().collections;
  const contentOperations = createWorkspaceContentOperations({
    entriesCollection,
    collectionsCollection
  });
  const disposeWorkspaceContent = async (targetWorkspaceID: string) => {
    const currentCollections = contentCollections();

    if (currentCollections.workspaceID === targetWorkspaceID) {
      const nextCollections = createWorkspaceCollections();

      setContentCollections(nextCollections);
      await currentCollections.entries.dispose();
      await currentCollections.collections.dispose();
    }

    await clearWorkspaceContent(targetWorkspaceID);
  };

  const loading = () => {
    const { entries, collections } = contentCollections();

    return entries.isLoading() || collections.isLoading();
  };
  const readOnly = () => {
    return !isOnline() || !contentCollections().workspaceID;
  };

  createEffect(
    on(workspaceID, async (currentWorkspaceID, previousWorkspaceID) => {
      const previousCollections = contentCollections();
      const nextCollections = createWorkspaceCollections(currentWorkspaceID);

      setContentCollections(nextCollections);

      await previousCollections.entries.dispose();
      await previousCollections.collections.dispose();

      if (previousWorkspaceID && !currentWorkspaceID) {
        await clearWorkspaceContent(previousWorkspaceID);
      }
    })
  );

  createEffect(async () => {
    const tree = explorerTree();
    const treeWorkspaceID = workspaceID();

    if (!tree || !treeWorkspaceID) {
      return;
    }

    const { workspaceID: currentWorkspaceID, entries, collections } = contentCollections();

    if (currentWorkspaceID !== treeWorkspaceID) {
      return;
    }

    await Promise.all([entries.isReady(), collections.isReady()]);

    if (contentCollections().workspaceID !== treeWorkspaceID) {
      return;
    }

    entries.batch(() => {
      entries.removeMany({});
      entries.insertMany(tree.entries);
    });
    collections.batch(() => {
      collections.removeMany({});
      collections.insertMany(tree.collections);
    });
  });

  return {
    entriesCollection,
    collectionsCollection,
    disposeWorkspaceContent,
    loading,
    readOnly,
    ...contentOperations
  };
};

export { useWorkspaceContent };
