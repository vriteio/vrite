import { Collection as LocalDBCollection } from "@signaldb/core";
import { createWorkspaceContentOperations } from "./operations";
import {
  WORKSPACE_COLLECTIONS_STORE_NAME,
  WORKSPACE_ENTRIES_STORE_NAME,
  WORKSPACE_SCHEMAS_STORE_NAME,
  clearWorkspaceData,
  deleteIndexedDBDatabase,
  getWorkspaceDatabaseName
} from "./indexeddb";
import { createIndexedDBAdapter } from "./persistence";
import {
  type Collection,
  type CollectionAccess,
  type CollectionAction,
  type Entry,
  type EntryAction,
  client,
  type WorkspaceEvent
} from "#web/lib/api";
import solidReactivityAdapter from "@signaldb/solid";
import { useConnectivitySignal } from "@solid-primitives/connectivity";
import { type Accessor, createEffect, createMemo, createSignal, on } from "solid-js";
import {
  isPersistedCollection,
  isPersistedCollectionSchemaSummary,
  isPersistedEntry
} from "#web/lib/validation";
import { createWorkspacePublishingOperations, type PublishingState } from "../publishing";
import { TREE_ROOT_ID } from "#web/components/tree";
import {
  isSchemaMigrationActive,
  type SchemaMigrationProgress
} from "#web/lib/data/schema-migrations";

interface ExplorerTree {
  workspaceID: string;
  collections: Collection[];
  entries: Entry[];
  accessByCollectionID: Record<string, CollectionAccess>;
  workspaceContentAccess: CollectionAccess;
  topLevelCollectionIDs: string[];
  activeSchemaMigrations: SchemaMigrationProgress[];
  schemas: CollectionSchemaSummary[];
  publishing: {
    enabledCollectionIDs: string[];
    unpublishedEntryIDs: string[];
  } | null;
}
interface CollectionSchemaSummary {
  id: string;
  collectionID: string;
  enabled: boolean;
  hasActiveVersion: boolean;
  hasUnappliedChanges: boolean;
}
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
  const schemas = new LocalDBCollection<CollectionSchemaSummary>({
    name: `${databaseName}:schemas`,
    persistence: workspaceID
      ? createIndexedDBAdapter({
          databaseName,
          storeName: WORKSPACE_SCHEMAS_STORE_NAME,
          validate: isPersistedCollectionSchemaSummary
        })
      : undefined,
    reactivity: solidReactivityAdapter
  });
  const isReady = async () => {
    await Promise.all([entries.isReady(), collections.isReady(), schemas.isReady()]);
  };
  const dispose = async () => {
    await Promise.all([entries.dispose(), collections.dispose(), schemas.dispose()]);
  };

  return { workspaceID, entries, collections, schemas, isReady, dispose };
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
const useWorkspaceContent = (workspaceID: Accessor<string>) => {
  const isOnline = useConnectivitySignal();
  const [contentCollections, setContentCollections] = createSignal(createWorkspaceCollections());
  const [loading, setLoading] = createSignal(Boolean(workspaceID()));
  const [accessLoading, setAccessLoading] = createSignal(Boolean(workspaceID()));
  const [syncing, setSyncing] = createSignal(false);
  const [snapshotError, setSnapshotError] = createSignal(false);
  const [publishing, setPublishing] = createSignal<PublishingState | null>(null);
  const [schemaMigrations, setSchemaMigrations] = createSignal(
    new Map<string, SchemaMigrationProgress>()
  );
  const [accessByCollectionID, setAccessByCollectionID] = createSignal<
    Record<string, CollectionAccess>
  >({});
  const syncingWorkspaces = new Map<string, number>();
  const terminalSchemaMigrationIDs = new Set<string>();
  const schemaMigrationRemovalTimers = new Map<string, number>();
  const entriesCollection = () => contentCollections().entries;
  const collectionsCollection = () => contentCollections().collections;
  const schemasCollection = () => contentCollections().schemas;
  const activeSchemaMigrationCollectionIDs = createMemo(() => {
    return new Set(
      [...schemaMigrations().values()]
        .filter(isSchemaMigrationActive)
        .flatMap(({ collectionIDs }) => collectionIDs)
    );
  });
  const contentOperations = createWorkspaceContentOperations({
    entriesCollection,
    collectionsCollection
  });
  const publishingOperations = createWorkspacePublishingOperations({
    entriesCollection,
    collectionsCollection,
    publishing
  });
  const disposeWorkspaceContent = async (targetWorkspaceID: string) => {
    const currentCollections = contentCollections();

    if (currentCollections.workspaceID === targetWorkspaceID) {
      const nextCollections = createWorkspaceCollections();

      setContentCollections(nextCollections);
      await currentCollections.entries.dispose();
      await currentCollections.collections.dispose();
      await currentCollections.schemas.dispose();
    }

    await clearWorkspaceData(targetWorkspaceID);
  };

  const getCollectionAccess = (collectionID: string | null = null) => {
    const resolvedCollectionID = collectionID || TREE_ROOT_ID;

    return accessByCollectionID()[resolvedCollectionID] || null;
  };
  const canCollection = (collectionID: string | null, action: CollectionAction) => {
    return getCollectionAccess(collectionID)?.collectionActions.includes(action) ?? false;
  };
  const canEntry = (collectionID: string | null, action: EntryAction) => {
    return getCollectionAccess(collectionID)?.entryActions.includes(action) ?? false;
  };
  const hasCollectionActionInAnyCollection = (action: CollectionAction) => {
    return Object.values(accessByCollectionID()).some((access) => {
      return access.collectionActions.includes(action);
    });
  };
  const hasEntryActionInAnyCollection = (action: EntryAction) => {
    return Object.values(accessByCollectionID()).some((access) => {
      return access.entryActions.includes(action);
    });
  };
  const hasActiveSchemaMigration = (
    collectionID: string | null,
    includeDescendants = false
  ): boolean => {
    if (!collectionID) return false;

    const activeCollectionIDs = activeSchemaMigrationCollectionIDs();

    if (activeCollectionIDs.has(collectionID)) return true;
    if (!includeDescendants) return false;

    return collectionsCollection()
      .find()
      .fetch()
      .some((collection) => {
        return (
          activeCollectionIDs.has(collection.id) && collection.ancestors.includes(collectionID)
        );
      });
  };
  const getSchemaMigration = (collectionID: string): SchemaMigrationProgress | null => {
    const migrations = [...schemaMigrations().values()].filter(({ collectionIDs }) => {
      return collectionIDs.includes(collectionID);
    });

    return migrations.find(isSchemaMigrationActive) || migrations[migrations.length - 1] || null;
  };
  const dismissSchemaMigration = (migrationID: string) => {
    const timer = schemaMigrationRemovalTimers.get(migrationID);

    if (timer) window.clearTimeout(timer);

    schemaMigrationRemovalTimers.delete(migrationID);
    setSchemaMigrations((current) => {
      const next = new Map(current);

      next.delete(migrationID);
      return next;
    });
  };
  const scheduleSchemaMigrationRemoval = (migrationID: string) => {
    const currentTimer = schemaMigrationRemovalTimers.get(migrationID);

    if (currentTimer) window.clearTimeout(currentTimer);

    schemaMigrationRemovalTimers.set(
      migrationID,
      window.setTimeout(() => dismissSchemaMigration(migrationID), 1_800)
    );
  };
  const createCollection = ({ parentID }: { parentID?: string } = {}) => {
    const collection = contentOperations.collections.create({ parentID });
    const parentAccess = getCollectionAccess(parentID || null);

    if (!collection || !parentAccess) return collection;

    const collectionActions: CollectionAction[] = parentAccess.collectionActions.filter(
      (action) => {
        return (
          action === "collection:create-child" ||
          action === "collection:update" ||
          action === "collection:move" ||
          action === "collection:set-restricted" ||
          action === "collection:set-publishing"
        );
      }
    );

    if (collectionActions.includes("collection:update")) {
      collectionActions.push("collection:delete");
    }

    if (parentAccess.entryActions.includes("publishing:publish")) {
      collectionActions.push("publishing:publish-tree");
    }

    if (parentAccess.entryActions.includes("publishing:unpublish")) {
      collectionActions.push("publishing:unpublish-tree");
    }

    setAccessByCollectionID((current) => ({
      ...current,
      [collection.id]: {
        collectionActions,
        entryActions: parentAccess.entryActions
      }
    }));

    return collection;
  };
  const readOnly = (collectionID: string | null = null) => {
    return (
      !isOnline() ||
      syncing() ||
      !contentCollections().workspaceID ||
      hasActiveSchemaMigration(collectionID) ||
      !canEntry(collectionID, "entry:update")
    );
  };
  const getCollectionSchema = (collectionID: string) => {
    return schemasCollection().findOne({ collectionID });
  };
  const createCollectionSchema = async (collectionID: string) => {
    const schema = await client.schemas.create({ collectionID });

    schemasCollection().replaceOne(
      { id: schema.id },
      {
        id: schema.id,
        collectionID: schema.collectionID,
        enabled: schema.enabled,
        hasActiveVersion: Boolean(schema.activeVersion),
        hasUnappliedChanges: schema.hasUnappliedChanges
      },
      { upsert: true }
    );

    return schema;
  };
  const deleteCollectionSchema = async (schemaID: string) => {
    const result = await client.schemas.delete({ schemaID, confirmedDataLoss: true });

    if (!result.migrationID) schemasCollection().removeOne({ id: schemaID });

    return result;
  };
  const offline = () => !isOnline();
  const removePublishingEntries = (entryIDs: string[]) => {
    setPublishing((current) => {
      if (!current) return current;

      const unpublishedEntryIDs = new Set(current.unpublishedEntryIDs);

      for (const entryID of entryIDs) {
        unpublishedEntryIDs.delete(entryID);
      }

      return { ...current, unpublishedEntryIDs };
    });
  };
  const removePublishingCollections = (collectionIDs: string[]) => {
    setPublishing((current) => {
      if (!current) return current;

      const enabledCollectionIDs = new Set(current.enabledCollectionIDs);

      for (const collectionID of collectionIDs) {
        enabledCollectionIDs.delete(collectionID);
      }

      return { ...current, enabledCollectionIDs };
    });
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
    applyCollectionSnapshot(targetCollections.schemas, tree.schemas);
    applyCollectionSnapshot(targetCollections.collections, [
      ...tree.collections,
      {
        id: TREE_ROOT_ID,
        name: TREE_ROOT_ID,
        restricted: false,
        ancestors: [],
        descendants: tree.topLevelCollectionIDs
      }
    ]);
    setAccessByCollectionID({
      ...tree.accessByCollectionID,
      [TREE_ROOT_ID]: tree.workspaceContentAccess
    });
    setSchemaMigrations((current) => {
      const terminalMigrations = [...current].filter(([, migration]) => {
        return !isSchemaMigrationActive(migration);
      });

      return new Map([
        ...terminalMigrations,
        ...tree.activeSchemaMigrations.map((migration) => [migration.id, migration] as const)
      ]);
    });
    setPublishing(
      tree.publishing
        ? {
            enabledCollectionIDs: new Set(tree.publishing.enabledCollectionIDs),
            unpublishedEntryIDs: new Set(tree.publishing.unpublishedEntryIDs)
          }
        : null
    );
    setAccessLoading(false);
    setSnapshotError(false);
    setLoading(false);
  };
  const syncWorkspaceContent = async (targetWorkspaceID: string) => {
    if (!targetWorkspaceID) return;

    syncingWorkspaces.set(targetWorkspaceID, (syncingWorkspaces.get(targetWorkspaceID) ?? 0) + 1);

    if (contentCollections().workspaceID === targetWorkspaceID) {
      if (!accessByCollectionID()[TREE_ROOT_ID]) setAccessLoading(true);

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
        setAccessLoading(false);
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
        removePublishingEntries(event.data.ids);
        break;
      case "collection:create": {
        const access = event.access;

        contentOperations.sync.collections.applyCreate({ collection: event.data });

        if (access) {
          setAccessByCollectionID((current) => ({
            ...current,
            [event.data.id]: access
          }));
        }
        break;
      }
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
        removePublishingCollections(event.data.ids);
        setAccessByCollectionID((current) => {
          const next = { ...current };

          for (const collectionID of event.data.ids) {
            delete next[collectionID];
          }

          return next;
        });
        schemasCollection().removeMany({ collectionID: { $in: event.data.ids } });
        break;
      case "schema:create":
      case "schema:update":
      case "schema:content-reset":
        schemasCollection().replaceOne({ id: event.data.id }, event.data, { upsert: true });
        break;
      case "schema:delete":
        schemasCollection().removeOne({ id: event.data.id });
        break;
      case "schema-migration:update": {
        setSchemaMigrations((current) => {
          const next = new Map(current);
          const terminal = event.data.status === "completed" || event.data.status === "failed";

          if (terminal) {
            terminalSchemaMigrationIDs.add(event.data.id);
          }

          if (terminal || !terminalSchemaMigrationIDs.has(event.data.id)) {
            next.set(event.data.id, event.data);
          }

          return next;
        });

        if (event.data.status === "completed") {
          scheduleSchemaMigrationRemoval(event.data.id);
          void syncWorkspaceContent(targetWorkspaceID).catch((error) => {
            console.error("Failed to refresh migrated content", error);
          });
        }
        break;
      }
      case "publishing:collection-update":
        setPublishing((current) => {
          if (!current) return current;

          const enabledCollectionIDs = new Set(current.enabledCollectionIDs);

          if (event.data.enabled) {
            enabledCollectionIDs.add(event.data.id);
          } else {
            enabledCollectionIDs.delete(event.data.id);
          }

          return { ...current, enabledCollectionIDs };
        });
        break;
      case "publishing:entries-update":
        if (event.data.channel !== "published") break;

        setPublishing((current) => {
          if (!current) return current;

          const unpublishedEntryIDs = new Set(current.unpublishedEntryIDs);

          for (const entry of event.data.entries) {
            if (entry.hasUnpublishedChanges) {
              unpublishedEntryIDs.add(entry.entryID);
            } else {
              unpublishedEntryIDs.delete(entry.entryID);
            }
          }

          return { ...current, unpublishedEntryIDs };
        });
        break;
      case "publishing:entries-content-update":
        setPublishing((current) => {
          if (!current) return current;

          const unpublishedEntryIDs = new Set(current.unpublishedEntryIDs);

          for (const contentUpdate of event.data.entries) {
            const entry = entriesCollection().findOne({ id: contentUpdate.entryID });
            const collection = entry?.collectionID
              ? collectionsCollection().findOne({ id: entry.collectionID })
              : undefined;
            const publishingEnabled = collection
              ? [collection.id, ...collection.ancestors].some((collectionID) => {
                  return current.enabledCollectionIDs.has(collectionID);
                })
              : false;

            if (publishingEnabled && !contentUpdate.matchesPublishedVersion) {
              unpublishedEntryIDs.add(contentUpdate.entryID);
            } else {
              unpublishedEntryIDs.delete(contentUpdate.entryID);
            }
          }

          return { ...current, unpublishedEntryIDs };
        });
        break;
    }
  };
  const switchWorkspace = async (currentWorkspaceID: string, previousWorkspaceID?: string) => {
    setLoading(Boolean(currentWorkspaceID));
    setAccessLoading(Boolean(currentWorkspaceID));
    setSyncing((syncingWorkspaces.get(currentWorkspaceID) ?? 0) > 0);
    setSnapshotError(false);
    setPublishing(null);
    setSchemaMigrations(new Map());
    terminalSchemaMigrationIDs.clear();
    for (const timer of schemaMigrationRemovalTimers.values()) window.clearTimeout(timer);
    schemaMigrationRemovalTimers.clear();
    setAccessByCollectionID({});

    const previousCollections = contentCollections();
    const nextCollections = createWorkspaceCollections(currentWorkspaceID);

    setContentCollections(nextCollections);

    void previousCollections.dispose();

    if (previousWorkspaceID && !currentWorkspaceID) {
      await clearWorkspaceContent(previousWorkspaceID);
    }

    if (!currentWorkspaceID) {
      setLoading(false);
      setAccessLoading(false);
      return;
    }

    await nextCollections.isReady();

    if (contentCollections().workspaceID !== currentWorkspaceID) {
      return;
    }

    if (
      nextCollections.entries.findOne({}) ||
      nextCollections.collections.findOne({}) ||
      nextCollections.schemas.findOne({})
    ) {
      setLoading(false);
    }
  };

  createEffect(
    on(workspaceID, (currentWorkspaceID, previousWorkspaceID) => {
      void switchWorkspace(currentWorkspaceID, previousWorkspaceID);
    })
  );

  return {
    accessLoading,
    entriesCollection,
    collectionsCollection,
    schemasCollection,
    disposeWorkspaceContent,
    applyWorkspaceEvent,
    syncWorkspaceContent,
    loading,
    syncing,
    snapshotError,
    publishing,
    canCollection,
    canEntry,
    getCollectionAccess,
    hasCollectionActionInAnyCollection,
    hasEntryActionInAnyCollection,
    hasActiveSchemaMigration,
    getSchemaMigration,
    dismissSchemaMigration,
    schemaMigrations,
    readOnly,
    offline,
    schemas: {
      create: createCollectionSchema,
      delete: deleteCollectionSchema,
      get: getCollectionSchema
    },
    ...publishingOperations,
    ...contentOperations,
    collections: {
      ...contentOperations.collections,
      create: createCollection
    }
  };
};

export { useWorkspaceContent };
