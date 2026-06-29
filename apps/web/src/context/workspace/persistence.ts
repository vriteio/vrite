import { createPersistenceAdapter } from "@signaldb/core";
import { deleteDB, openDB, type IDBPDatabase } from "idb";

interface IndexedDBAdapterOptions {
  databaseName?: string;
  storeName?: string;
  stores?: string[];
}

const LEGACY_STORE_NAME = "items";
const isIndexedDBAvailable = () => {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
};
const deleteIndexedDBDatabase = async (name: string) => {
  if (!isIndexedDBAvailable()) {
    return;
  }

  await deleteDB(name);
};
const createIndexedDBAdapter = <T extends { id: I } & Record<string, any>, I extends IDBValidKey>(
  name: string,
  options?: IndexedDBAdapterOptions
) => {
  const {
    databaseName: explicitDatabaseName,
    storeName = LEGACY_STORE_NAME,
    stores = []
  } = options || {};
  const databaseName = explicitDatabaseName || name;
  const requestedStores = Array.from(new Set([storeName, ...stores]));

  async function openDatabase(
    targetDatabaseName: string,
    targetStoreNames: string[]
  ): Promise<IDBPDatabase | null> {
    if (!isIndexedDBAvailable()) {
      return null;
    }

    const database = await openDB(targetDatabaseName);

    database.addEventListener("versionchange", () => database.close());

    const missingStores = targetStoreNames.filter(
      (targetStoreName) => !database.objectStoreNames.contains(targetStoreName)
    );

    if (missingStores.length === 0) {
      return database;
    }

    const nextVersion = database.version + 1;

    database.close();

    const upgradedDatabase = await openDB(targetDatabaseName, nextVersion, {
      upgrade(upgradeDatabase) {
        for (const targetStoreName of targetStoreNames) {
          if (!upgradeDatabase.objectStoreNames.contains(targetStoreName)) {
            upgradeDatabase.createObjectStore(targetStoreName, { keyPath: "id" });
          }
        }
      }
    });

    upgradedDatabase.addEventListener("versionchange", () => upgradedDatabase.close());

    return upgradedDatabase;
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

      return { items };
    },
    async save(items, { added, modified, removed }) {
      const database = await openDatabase(databaseName, requestedStores);

      if (!database) {
        return;
      }

      const transaction = database.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const currentIDs = new Set(items.map((item) => item.id));

      try {
        removed.forEach((item) => {
          if (!currentIDs.has(item.id)) {
            store.delete(item.id);
          }
        });
        added.forEach((item) => store.put(item));
        modified.forEach((item) => store.put(item));

        await transaction.done;
      } finally {
        database.close();
      }
    },
    async register() {
      return;
    }
  });
};

export { createIndexedDBAdapter, deleteIndexedDBDatabase };
