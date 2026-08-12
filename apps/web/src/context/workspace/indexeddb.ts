import { deleteDB, openDB, type IDBPDatabase, type IDBPTransaction } from "idb";

interface ClearPersistenceDataOptions {
  persist?: string[];
}

type WorkspaceDatabaseUpgradeTransaction = IDBPTransaction<unknown, string[], "versionchange">;

const WORKSPACE_DATA_PREFIX = "andesine:";
const WORKSPACE_ENTRIES_STORE_NAME = "entries";
const WORKSPACE_COLLECTIONS_STORE_NAME = "collections";
const WORKSPACE_UPDATES_STORE_NAME = "entry-updates";
const WORKSPACE_ENTRY_ID_INDEX_NAME = "entryID";
const workspaceDatabaseSetupPromises = new Map<string, Promise<void>>();

const isIndexedDBAvailable = () => {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
};
const hasWorkspaceDatabaseSchema = (database: IDBPDatabase): boolean => {
  const hasEntriesStore = database.objectStoreNames.contains(WORKSPACE_ENTRIES_STORE_NAME);
  const hasCollectionsStore = database.objectStoreNames.contains(WORKSPACE_COLLECTIONS_STORE_NAME);
  const hasUpdatesStore = database.objectStoreNames.contains(WORKSPACE_UPDATES_STORE_NAME);

  if (!hasEntriesStore || !hasCollectionsStore || !hasUpdatesStore) return false;

  const transaction = database.transaction(WORKSPACE_UPDATES_STORE_NAME, "readonly");

  return transaction.store.indexNames.contains(WORKSPACE_ENTRY_ID_INDEX_NAME);
};
const createMissingWorkspaceDatabaseSchema = (
  database: IDBPDatabase,
  transaction: WorkspaceDatabaseUpgradeTransaction
): void => {
  if (!database.objectStoreNames.contains(WORKSPACE_ENTRIES_STORE_NAME)) {
    database.createObjectStore(WORKSPACE_ENTRIES_STORE_NAME, { keyPath: "id" });
  }

  if (!database.objectStoreNames.contains(WORKSPACE_COLLECTIONS_STORE_NAME)) {
    database.createObjectStore(WORKSPACE_COLLECTIONS_STORE_NAME, { keyPath: "id" });
  }

  const updatesStore = database.objectStoreNames.contains(WORKSPACE_UPDATES_STORE_NAME)
    ? transaction.objectStore(WORKSPACE_UPDATES_STORE_NAME)
    : database.createObjectStore(WORKSPACE_UPDATES_STORE_NAME, {
        autoIncrement: true,
        keyPath: "id"
      });

  if (!updatesStore.indexNames.contains(WORKSPACE_ENTRY_ID_INDEX_NAME)) {
    updatesStore.createIndex(WORKSPACE_ENTRY_ID_INDEX_NAME, WORKSPACE_ENTRY_ID_INDEX_NAME);
  }
};
const setupWorkspaceDatabase = async (name: string): Promise<void> => {
  let isSchemaReady = false;

  while (!isSchemaReady) {
    const database = await openDB(name);

    if (hasWorkspaceDatabaseSchema(database)) {
      database.close();
      return;
    }

    const nextVersion = database.version + 1;

    database.close();

    try {
      const upgradedDatabase = await openDB(name, nextVersion, {
        upgrade(upgradeDatabase, _oldVersion, _newVersion, transaction) {
          createMissingWorkspaceDatabaseSchema(upgradeDatabase, transaction);
        }
      });

      isSchemaReady = hasWorkspaceDatabaseSchema(upgradedDatabase);
      upgradedDatabase.close();
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== "VersionError") throw error;
    }
  }
};
const ensureWorkspaceDatabase = async (name: string): Promise<void> => {
  const existingSetupPromise = workspaceDatabaseSetupPromises.get(name);

  if (existingSetupPromise) {
    await existingSetupPromise;
    return;
  }

  const setupPromise = setupWorkspaceDatabase(name);

  workspaceDatabaseSetupPromises.set(name, setupPromise);

  try {
    await setupPromise;
  } finally {
    workspaceDatabaseSetupPromises.delete(name);
  }
};
const openWorkspaceDatabase = async (name: string): Promise<IDBPDatabase | null> => {
  if (!isIndexedDBAvailable()) return null;

  while (true) {
    await ensureWorkspaceDatabase(name);

    const database = await openDB(name);

    if (hasWorkspaceDatabaseSchema(database)) {
      database.addEventListener("versionchange", () => database.close());
      return database;
    }

    database.close();
  }
};
const deleteIndexedDBDatabase = async (name: string): Promise<void> => {
  if (!isIndexedDBAvailable()) return;

  await workspaceDatabaseSetupPromises.get(name)?.catch(() => undefined);
  await deleteDB(name);
};
const listIndexedDBDatabaseNames = async (): Promise<string[]> => {
  if (!isIndexedDBAvailable() || typeof window.indexedDB.databases !== "function") return [];

  const databases = await window.indexedDB.databases();

  return databases.flatMap(({ name }) => (name ? [name] : []));
};
const deleteIndexedDBDatabases = async (names: Iterable<string>): Promise<void> => {
  await Promise.allSettled(Array.from(new Set(names)).map((name) => deleteIndexedDBDatabase(name)));
};
const getDatabaseWorkspaceID = (name: string): string | null => {
  if (name.startsWith(`${WORKSPACE_DATA_PREFIX}ws_`)) {
    return name.slice(WORKSPACE_DATA_PREFIX.length);
  }

  return null;
};
const getWorkspaceDatabaseName = (workspaceID: string) => {
  return `${WORKSPACE_DATA_PREFIX}${workspaceID}`;
};
const clearWorkspaceData = async (workspaceID: string): Promise<void> => {
  await deleteIndexedDBDatabase(getWorkspaceDatabaseName(workspaceID));
};
const clearPersistenceData = async (options: ClearPersistenceDataOptions = {}): Promise<void> => {
  const persistedWorkspaceIDs = new Set(options.persist);
  const databaseNames = await listIndexedDBDatabaseNames();

  await deleteIndexedDBDatabases(
    databaseNames.filter((name) => {
      if (!name.startsWith(WORKSPACE_DATA_PREFIX)) return false;

      const workspaceID = getDatabaseWorkspaceID(name);

      return workspaceID === null || !persistedWorkspaceIDs.has(workspaceID);
    })
  );
};

export {
  WORKSPACE_COLLECTIONS_STORE_NAME,
  WORKSPACE_ENTRIES_STORE_NAME,
  WORKSPACE_ENTRY_ID_INDEX_NAME,
  WORKSPACE_UPDATES_STORE_NAME,
  clearPersistenceData,
  clearWorkspaceData,
  deleteIndexedDBDatabase,
  getWorkspaceDatabaseName,
  isIndexedDBAvailable,
  openWorkspaceDatabase
};
