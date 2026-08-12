import { createPersistenceAdapter } from "@signaldb/core";
import { isIndexedDBAvailable, openWorkspaceDatabase } from "./indexeddb";

interface IndexedDBAdapterOptions {
  databaseName: string;
  storeName: string;
  validate?(value: unknown): boolean;
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- SignalDB adapters use its open-ended BaseItem shape. */
const createIndexedDBAdapter = <T extends { id: I } & Record<string, any>, I extends IDBValidKey>(
  options: IndexedDBAdapterOptions
) => {
  const { databaseName, storeName, validate } = options;

  async function readAllItems(targetDatabaseName: string, targetStoreName: string): Promise<T[]> {
    const database = await openWorkspaceDatabase(targetDatabaseName);

    if (!database || !database.objectStoreNames.contains(targetStoreName)) {
      database?.close();

      return [];
    }

    try {
      const items: unknown[] = await database.getAll(targetStoreName);

      return items.filter((item): item is T => (validate ? validate(item) : true));
    } finally {
      database.close();
    }
  }

  /**
   * Retrieves all items from the IndexedDB object store.
   * @returns A promise that resolves with an array of items.
   */
  async function getAllItems(): Promise<T[]> {
    return readAllItems(databaseName, storeName);
  }

  return createPersistenceAdapter<T, I>({
    async load() {
      if (!isIndexedDBAvailable()) {
        return { items: [] as T[] };
      }

      try {
        const items = await getAllItems();

        return { items };
      } catch {
        return { items: [] as T[] };
      }
    },
    async save(items, { added, modified, removed }) {
      const database = await openWorkspaceDatabase(databaseName);

      if (!database) {
        return;
      }

      const transaction = database.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const currentIDs = new Set(items.map((item) => item.id));

      try {
        removed.forEach((item) => {
          if (!currentIDs.has(item.id)) {
            void store.delete(item.id);
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

export { createIndexedDBAdapter };
