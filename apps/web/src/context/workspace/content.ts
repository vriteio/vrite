import { Collection as LocalDBCollection } from "@signaldb/core";
import { createWorkspaceContentOperations } from "./operations";
import {
  WORKSPACE_COLLECTIONS_STORE_NAME,
  WORKSPACE_ENTRIES_STORE_NAME,
  clearWorkspaceData,
  deleteIndexedDBDatabase,
  getWorkspaceDatabaseName
} from "./indexeddb";
import { createIndexedDBAdapter } from "./persistence";
import { type Collection, type Entry, client, type WorkspaceEvent } from "#web/lib/api";
import solidReactivityAdapter from "@signaldb/solid";
import { useConnectivitySignal } from "@solid-primitives/connectivity";
import { type Accessor, createEffect, createSignal, on, untrack } from "solid-js";
import { isPersistedCollection, isPersistedEntry } from "#web/lib/validation";

type ExplorerTree = {
  workspaceID: string;
  collections: Collection[];
  entries: Entry[];
};
const getWorkspaceContentDatabaseName = (workspaceID?: string) => {
  return getWorkspaceDatabaseName(workspaceID || "ephemeral");
};
const createWorkspaceCollections = (workspaceID?: string) => {
  const databaseName = getWorkspaceContentDatabaseName(workspaceID);
  const entries = new LocalDBCollection<Entry>({
    name: `${databaseName}:entries`,
    persistence: workspaceID
      ? createIndexedDBAdapter({
          databaseName,
          storeName: WORKSPACE_ENTRIES_STORE_NAME,
          validate: isPersistedEntry
        })
      : undefined,
    reactivity: solidReactivityAdapter
  });
  const collections = new LocalDBCollection<Collection>({
    name: `${databaseName}:collections`,
    persistence: workspaceID
      ? createIndexedDBAdapter({
          databaseName,
          storeName: WORKSPACE_COLLECTIONS_STORE_NAME,
          validate: isPersistedCollection
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
/* eslint-disable @typescript-eslint/no-explicit-any -- SignalDB selectors require its open-ended BaseItem shape. */
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
const useWorkspaceContent = (workspaceID: Accessor<string>, canWrite: Accessor<boolean>) => {
  const isOnline = useConnectivitySignal();
  const [contentCollections, setContentCollections] = createSignal(createWorkspaceCollections());
  const [loading, setLoading] = createSignal(Boolean(workspaceID()));
  const [syncing, setSyncing] = createSignal(false);
  const [snapshotError, setSnapshotError] = createSignal(false);
  const syncingWorkspaces = new Map<string, number>();
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

    await clearWorkspaceData(targetWorkspaceID);
  };

  const readOnly = () => {
    return !isOnline() || syncing() || !contentCollections().workspaceID || !canWrite();
  };
  const offline = () => !isOnline();
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
    setSnapshotError(false);
    setLoading(false);
  };
  const syncWorkspaceContent = async (targetWorkspaceID: string) => {
    if (!targetWorkspaceID) return;

    syncingWorkspaces.set(targetWorkspaceID, (syncingWorkspaces.get(targetWorkspaceID) ?? 0) + 1);

    if (contentCollections().workspaceID === targetWorkspaceID) {
      setSyncing(true);
    }

    try {
      const explorerTree = await client.sync.getExplorerTree();
      const targetCollections = contentCollections();

      await applyExplorerTree(
        { workspaceID: targetWorkspaceID, ...explorerTree },
        targetCollections
      );
    } catch (error) {
      if (contentCollections().workspaceID === targetWorkspaceID) {
        setSnapshotError(true);
        setLoading(false);
      }

      throw error;
    } finally {
      const remainingSyncs = (syncingWorkspaces.get(targetWorkspaceID) ?? 1) - 1;

      if (remainingSyncs > 0) {
        syncingWorkspaces.set(targetWorkspaceID, remainingSyncs);
      } else {
        syncingWorkspaces.delete(targetWorkspaceID);
      }

      if (contentCollections().workspaceID === targetWorkspaceID) {
        setSyncing(remainingSyncs > 0);
      }
    }
  };
  const applyWorkspaceEvent = (targetWorkspaceID: string, event: WorkspaceEvent) => {
    const targetCollections = contentCollections();

    if (targetCollections.workspaceID !== targetWorkspaceID) return;

    switch (event.action) {
      case "entry:create":
        contentOperations.sync.entries.applyCreate({ entry: event.data });
        break;
      case "entry:update": {
        const { id, ...updates } = event.data;

        contentOperations.sync.entries.applyUpdate({ entryID: id, updates });
        break;
      }
      case "entry:move": {
        const updates: Partial<Entry> = {};

        if (event.data.order !== undefined) {
          updates.order = event.data.order;
        }

        if (event.data.collectionID !== undefined) {
          updates.collectionID = event.data.collectionID ?? undefined;
        }

        contentOperations.sync.entries.applyUpdate({ entryID: event.data.id, updates });
        break;
      }
      case "entry:delete":
        contentOperations.sync.entries.applyDelete({ entryIDs: event.data.ids });
        break;
      case "collection:create":
        contentOperations.sync.collections.applyCreate({ collection: event.data });
        break;
      case "collection:update": {
        const { id, ...updates } = event.data;

        contentOperations.sync.collections.applyUpdate({ collectionID: id, updates });
        break;
      }
      case "collection:move":
        contentOperations.sync.collections.applyMove({
          collectionID: event.data.id,
          parentID: event.data.newParentID ?? null,
          index: event.data.index
        });
        break;
      case "collection:delete":
        contentOperations.sync.collections.applyDelete({ collectionIDs: event.data.ids });
        break;
    }
  };
  const switchWorkspace = async (currentWorkspaceID: string, previousWorkspaceID?: string) => {
    setLoading(Boolean(currentWorkspaceID));
    setSyncing((syncingWorkspaces.get(currentWorkspaceID) ?? 0) > 0);
    setSnapshotError(false);

    const previousCollections = contentCollections();
    const nextCollections = createWorkspaceCollections(currentWorkspaceID);

    setContentCollections(nextCollections);

    void previousCollections.dispose();

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

    if (nextCollections.entries.findOne({}) || nextCollections.collections.findOne({})) {
      setLoading(false);
    }
  };

  createEffect(
    on(workspaceID, (currentWorkspaceID, previousWorkspaceID) => {
      void switchWorkspace(currentWorkspaceID, previousWorkspaceID);
    })
  );

  return {
    entriesCollection,
    collectionsCollection,
    disposeWorkspaceContent,
    applyWorkspaceEvent,
    syncWorkspaceContent,
    loading,
    syncing,
    snapshotError,
    readOnly,
    offline,
    ...contentOperations
  };
};

export { useWorkspaceContent };
