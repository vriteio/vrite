import { Collection as LocalDBCollection } from "@signaldb/core";
import { createWorkspaceContentOperations } from "./content-operations";
import { createIndexedDBAdapter, deleteIndexedDBDatabase } from "./persistence";
import { Collection, Entry, client } from "#web/lib/client";
import solidReactivityAdapter from "@signaldb/solid";
import { useConnectivitySignal } from "@solid-primitives/connectivity";
import { Accessor, createEffect, createResource, createSignal, on } from "solid-js";
import { isServer } from "solid-js/web";

type ExplorerTree = {
  workspaceID: string;
  collections: Collection[];
  entries: Entry[];
};
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
  const [explorerTree] = createResource<ExplorerTree, string>(
    () => (isServer ? "" : workspaceID()),
    async (workspaceID) => {
      if (!workspaceID) {
        return { workspaceID: "", collections: [], entries: [] };
      }

      const explorerTree = await client.sync.getExplorerTree();

      return { workspaceID, ...explorerTree };
    },
    { initialValue: { workspaceID: "", collections: [], entries: [] } }
  );
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

    if (currentCollections.workspaceID === targetWorkspaceID) {
      const nextCollections = createWorkspaceCollections();

      setContentCollections(nextCollections);
      await currentCollections.entries.dispose();
      await currentCollections.collections.dispose();
    }

    await clearWorkspaceContent(targetWorkspaceID);
  };

  const readOnly = () => {
    return !isOnline() || !contentCollections().workspaceID;
  };
  const offline = () => {
    return !isOnline();
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

    if (
      contentCollections().workspaceID === currentWorkspaceID &&
      hasLocalContent(nextCollections)
    ) {
      setLoading(false);
    }
  };

  const applyExplorerTree = async (tree: ExplorerTree) => {
    const {
      workspaceID: collectionsWorkspaceID,
      entries,
      collections,
      isReady
    } = contentCollections();

    if (collectionsWorkspaceID !== tree.workspaceID) {
      return;
    }

    await isReady();

    if (contentCollections().workspaceID !== tree.workspaceID) {
      return;
    }

    applyCollectionSnapshot(entries, tree.entries);
    applyCollectionSnapshot(collections, tree.collections);
    setLoading(false);
  };

  createEffect(
    on(workspaceID, (currentWorkspaceID, previousWorkspaceID) => {
      switchWorkspace(currentWorkspaceID, previousWorkspaceID);
    })
  );

  createEffect(() => {
    const tree = explorerTree();
    const currentWorkspaceID = workspaceID();

    if (!tree || !currentWorkspaceID || tree.workspaceID !== currentWorkspaceID) {
      return;
    }

    applyExplorerTree(tree);
  });

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
