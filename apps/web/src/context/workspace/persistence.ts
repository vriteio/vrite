import { createPersistenceAdapter } from "@signaldb/core";
import { openDB, type IDBPDatabase } from "idb";

interface IndexedDBAdapterOptions {
  prefix?: string;
  databaseName?: string;
  storeName?: string;
  stores?: string[];
  legacyDatabaseName?: string;
}

const LEGACY_STORE_NAME = "items";
const databaseOperationQueues = new Map<string, Promise<unknown>>();
const isIndexedDBAvailable = () => {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
};
const createIndexedDBAdapter = <T extends { id: I } & Record<string, any>, I extends IDBValidKey>(
  name: string,
  options?: IndexedDBAdapterOptions
) => {
  const {
    prefix = "signaldb-",
    databaseName: explicitDatabaseName,
    storeName = LEGACY_STORE_NAME,
    stores = [],
    legacyDatabaseName: explicitLegacyDatabaseName
  } = options || {};
  const databaseName = `${prefix}${explicitDatabaseName ?? name}`;
  const legacyDatabaseName = explicitLegacyDatabaseName
    ? `${prefix}${explicitLegacyDatabaseName}`
    : null;
  const requestedStores = Array.from(new Set([storeName, ...stores]));

  function queueDatabaseOperation<R>(targetDatabaseName: string, task: () => Promise<R>) {
    const previous = databaseOperationQueues.get(targetDatabaseName) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(task);

    databaseOperationQueues.set(
      targetDatabaseName,
      next.catch(() => undefined)
    );

    return next;
  }

  async function openDatabase(
    targetDatabaseName: string,
    targetStoreNames: string[]
  ): Promise<IDBPDatabase | null> {
    return queueDatabaseOperation(targetDatabaseName, async () => {
      if (!isIndexedDBAvailable()) {
        return null;
      }

      const database = await openDB(targetDatabaseName);
      const missingStores = targetStoreNames.filter(
        (targetStoreName) => !database.objectStoreNames.contains(targetStoreName)
      );

      if (missingStores.length === 0) {
        return database;
      }

      const nextVersion = database.version + 1;

      database.close();

      return openDB(targetDatabaseName, nextVersion, {
        upgrade(upgradeDatabase) {
          for (const targetStoreName of targetStoreNames) {
            if (!upgradeDatabase.objectStoreNames.contains(targetStoreName)) {
              upgradeDatabase.createObjectStore(targetStoreName, { keyPath: "id" });
            }
          }
        }
      });
    });
  }

  async function readAllItems(
    targetDatabaseName: string,
    targetStoreName: string,
    targetStores: string[] = [targetStoreName]
  ): Promise<T[]> {
    const database = await openDatabase(targetDatabaseName, targetStores);

    if (!database || !database.objectStoreNames.contains(targetStoreName)) {
      database?.close();
      return [];
    }

    try {
      return (await database.getAll(targetStoreName)) as T[];
    } finally {
      database.close();
    }
  }

  async function databaseExists(targetDatabaseName: string): Promise<boolean> {
    if (!isIndexedDBAvailable() || typeof indexedDB.databases !== "function") {
      return false;
    }

    const databases = await indexedDB.databases();

    return databases.some((database) => database.name === targetDatabaseName);
  }

  async function persistChanges(options: {
    added?: T[];
    modified?: T[];
    removed?: Array<{ id: I }>;
  }): Promise<void> {
    const database = await openDatabase(databaseName, requestedStores);

    if (!database) {
      return;
    }

    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);

    try {
      // Sync can reclassify an existing record as added when reconciling snapshots,
      // so all writes need to be idempotent to avoid aborting the whole transaction.
      (options.added ?? []).forEach((item) => store.put(item));
      (options.modified ?? []).forEach((item) => store.put(item));
      (options.removed ?? []).forEach((item) => store.delete(item.id));

      await transaction.done;
    } finally {
      database.close();
    }
  }

  /**
   * Retrieves all items from the IndexedDB object store.
   * @returns A promise that resolves with an array of items.
   */
  async function getAllItems(): Promise<T[]> {
    return readAllItems(databaseName, storeName, requestedStores);
  }

  return createPersistenceAdapter<T, I>({
    async load() {
      if (!isIndexedDBAvailable()) {
        return { items: [] as T[] };
      }

      const items = await getAllItems();

      if (items.length > 0 || !legacyDatabaseName || legacyDatabaseName === databaseName) {
        return { items };
      }

      if (!(await databaseExists(legacyDatabaseName))) {
        return { items };
      }

      const legacyItems = await readAllItems(legacyDatabaseName, LEGACY_STORE_NAME);

      if (legacyItems.length > 0) {
        await persistChanges({ added: legacyItems });
      }

      return { items: legacyItems };
    },
    async save(items, { added, modified, removed }) {
      void items;

      await persistChanges({ added, modified, removed });
    },
    async register() {
      return;
    }
  });
};

export { createIndexedDBAdapter };
