import { Collection as LocalDBCollection } from "@signaldb/core";
import { createWorkspaceContentOperations } from "./operations";
import {
  WORKSPACE_DATA_PREFIX,
  clearWorkspaceData,
  createIndexedDBAdapter,
  deleteIndexedDBDatabase
} from "./persistence";
import { Collection, Entry, client } from "#web/lib/client";
import solidReactivityAdapter from "@signaldb/solid";
import { useConnectivitySignal } from "@solid-primitives/connectivity";
import { Accessor, createEffect, createSignal, on } from "solid-js";

type ExplorerTree = {
  workspaceID: string;
  collections: Collection[];
  entries: Entry[];
};
const getWorkspaceContentDatabaseName = (workspaceID?: string) => {
  return `${WORKSPACE_DATA_PREFIX}${workspaceID || "ephemeral"}`;
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
  const isReady = async () => {
    await Promise.all([entries.isReady(), collections.isReady()]);
  };
  const dispose = async () => {
    await Promise.all([entries.dispose(), collections.dispose()]);
  };

  return { workspaceID, entries, collections, isReady, dispose };
};
const clearWorkspaceContent = async (workspaceID: string) => {
  await deleteIndexedDBDatabase(getWorkspaceContentDatabaseName(workspaceID));
};
const hasLocalContent = (collections: ReturnType<typeof createWorkspaceCollections>) => {
  return Boolean(collections.entries.findOne({}) || collections.collections.findOne({}));
};
const applyCollectionSnapshot = <T extends { id: IDBValidKey } & Record<string, any>>(
  collection: LocalDBCollection<T>,
  snapshot: T[]
) => {
  const snapshotIDs = new Set(snapshot.map((item) => item.id));
  const existingItems = collection.find().fetch();

  collection.batch(() => {
    for (const item of existingItems) {
      if (!snapshotIDs.has(item.id)) {
        collection.removeOne({ id: item.id } as any);
      }
    }

    for (const item of snapshot) {
      collection.replaceOne({ id: item.id } as any, item, { upsert: true });
    }
  });
};
const useWorkspaceContent = (workspaceID: Accessor<string>) => {
  const isOnline = useConnectivitySignal();
  const [contentCollections, setContentCollections] = createSignal(createWorkspaceCollections());
  const [loading, setLoading] = createSignal(Boolean(workspaceID()));
  const entriesCollection = () => contentCollections().entries;
  const collectionsCollection = () => contentCollections().collections;
  const contentOperations = createWorkspaceContentOperations({
    entriesCollection,
    collectionsCollection
  });
  const disposeWorkspaceContent = async (targetWorkspaceID: string) => {
    const currentCollections = contentCollections();
    const entryIDs =
      currentCollections.workspaceID === targetWorkspaceID
        ? currentCollections.entries
            .find()
            .fetch()
            .map(({ id }) => id)
        : [];

    if (currentCollections.workspaceID === targetWorkspaceID) {
      const nextCollections = createWorkspaceCollections();

      setContentCollections(nextCollections);
      await currentCollections.entries.dispose();
      await currentCollections.collections.dispose();
    }

    await clearWorkspaceData(targetWorkspaceID, entryIDs);
  };

  const readOnly = () => {
    return !isOnline() || !contentCollections().workspaceID;
  };
  const offline = () => {
    return !isOnline();
  };
  const applyExplorerTree = async (
    tree: ExplorerTree,
    targetCollections: ReturnType<typeof createWorkspaceCollections>
  ) => {
    if (targetCollections.workspaceID !== tree.workspaceID) {
      return;
    }

    await targetCollections.isReady();

    if (contentCollections().workspaceID !== tree.workspaceID) {
      return;
    }

    applyCollectionSnapshot(targetCollections.entries, tree.entries);
    applyCollectionSnapshot(targetCollections.collections, tree.collections);
    setLoading(false);
  };
  const switchWorkspace = async (currentWorkspaceID: string, previousWorkspaceID?: string) => {
    setLoading(Boolean(currentWorkspaceID));

    const previousCollections = contentCollections();
    const nextCollections = createWorkspaceCollections(currentWorkspaceID);

    setContentCollections(nextCollections);
    previousCollections.dispose();

    if (previousWorkspaceID && !currentWorkspaceID) {
      await clearWorkspaceContent(previousWorkspaceID);
    }

    if (!currentWorkspaceID) {
      setLoading(false);
      return;
    }

    await nextCollections.isReady();

    if (contentCollections().workspaceID !== currentWorkspaceID) {
      return;
    }

    if (hasLocalContent(nextCollections)) {
      setLoading(false);
    }

    try {
      const explorerTree = await client.sync.getExplorerTree();

      await applyExplorerTree(
        { workspaceID: currentWorkspaceID, ...explorerTree },
        nextCollections
      );
    } catch (error) {
      if (contentCollections().workspaceID === currentWorkspaceID) {
        setLoading(false);
      }
    }
  };

  createEffect(
    on(workspaceID, (currentWorkspaceID, previousWorkspaceID) => {
      switchWorkspace(currentWorkspaceID, previousWorkspaceID);
    })
  );

  return {
    entriesCollection,
    collectionsCollection,
    disposeWorkspaceContent,
    loading,
    readOnly,
    offline,
    ...contentOperations
  };
};

export { useWorkspaceContent };
