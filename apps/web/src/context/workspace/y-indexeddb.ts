import type { IDBPDatabase, IDBPObjectStore } from "idb";
import * as Y from "yjs";
import {
  WORKSPACE_ENTRY_ID_INDEX_NAME,
  WORKSPACE_UPDATES_STORE_NAME,
  openWorkspaceDatabase
} from "./indexeddb";

interface PersistedUpdate {
  id?: number;
  entryID: string;
  update: Uint8Array;
}
interface WorkspaceIndexedDBPersistenceOptions {
  onError?(error: unknown): void;
}

type PersistenceUpdatesStore = IDBPObjectStore<
  unknown,
  [typeof WORKSPACE_UPDATES_STORE_NAME],
  typeof WORKSPACE_UPDATES_STORE_NAME,
  "readwrite"
>;

const PREFERRED_TRIM_SIZE = 500;

class PersistenceDestroyedError extends Error {
  name = "AbortError";
}

const openPersistenceDatabase = async (name: string): Promise<IDBPDatabase> => {
  const database = await openWorkspaceDatabase(name);

  if (!database) {
    throw new Error("IndexedDB is not available.");
  }

  return database;
};

const clearDocument = async (name: string, entryID: string): Promise<void> => {
  const database = await openPersistenceDatabase(name);
  const transaction = database.transaction(WORKSPACE_UPDATES_STORE_NAME, "readwrite");
  const updatesStore = transaction.objectStore(WORKSPACE_UPDATES_STORE_NAME);
  const updateKeys = await updatesStore.index(WORKSPACE_ENTRY_ID_INDEX_NAME).getAllKeys(entryID);

  for (const updateKey of updateKeys) {
    void updatesStore.delete(updateKey);
  }

  try {
    await transaction.done;
  } finally {
    database.close();
  }
};

class WorkspaceIndexedDBPersistence {
  doc: Y.Doc;
  entryID: string;
  name: string;
  synced = false;
  whenSynced: Promise<WorkspaceIndexedDBPersistence>;

  private database: IDBPDatabase | null = null;
  private databasePromise: Promise<IDBPDatabase>;
  private databaseReference = 0;
  private databaseSize = 0;
  private destroyed = false;
  private onError?: (error: unknown) => void;
  private reportedError = false;
  private storeTimeout = 1000;
  private storeTimeoutID: ReturnType<typeof setTimeout> | null = null;

  constructor(
    name: string,
    entryID: string,
    doc: Y.Doc,
    options: WorkspaceIndexedDBPersistenceOptions = {}
  ) {
    this.doc = doc;
    this.entryID = entryID;
    this.name = name;
    this.onError = options.onError;
    this.databasePromise = openPersistenceDatabase(this.name);
    this.whenSynced = this.initialize();
    void this.whenSynced.catch(() => undefined);

    doc.on("update", this.storeUpdate);
    doc.on("destroy", this.destroy);
  }

  private fetchUpdates = async (storeCurrentState = false) => {
    const database = this.database;

    if (!database) {
      throw new Error("The IndexedDB persistence database is not open.");
    }

    const transaction = database.transaction(WORKSPACE_UPDATES_STORE_NAME, "readwrite");
    const updatesStore = transaction.objectStore(WORKSPACE_UPDATES_STORE_NAME);
    const updatesIndex = updatesStore.index(WORKSPACE_ENTRY_ID_INDEX_NAME);
    const updates: PersistedUpdate[] = [];
    let cursor = await updatesIndex.openCursor(IDBKeyRange.only(this.entryID));
    let lastUpdateKey = this.databaseReference - 1;

    if (
      cursor &&
      typeof cursor.primaryKey === "number" &&
      cursor.primaryKey < this.databaseReference
    ) {
      cursor = await cursor.continuePrimaryKey(this.entryID, this.databaseReference);
    }

    while (cursor) {
      updates.push(cursor.value as PersistedUpdate);

      if (typeof cursor.primaryKey === "number") {
        lastUpdateKey = cursor.primaryKey;
      }

      cursor = await cursor.continue();
    }

    if (!this.destroyed && storeCurrentState) {
      const storedStateKey = await updatesStore.add({
        entryID: this.entryID,
        update: Y.encodeStateAsUpdate(this.doc)
      } satisfies PersistedUpdate);

      if (typeof storedStateKey === "number") {
        lastUpdateKey = Math.max(lastUpdateKey, storedStateKey);
      }
    }

    if (!this.destroyed) {
      Y.transact(
        this.doc,
        () => {
          for (const { update } of updates) {
            Y.applyUpdate(this.doc, update);
          }
        },
        this,
        false
      );
    }

    this.databaseReference = lastUpdateKey + 1;
    this.databaseSize = await updatesIndex.count(this.entryID);

    return { transaction, updatesStore };
  };

  private initialize = async (): Promise<WorkspaceIndexedDBPersistence> => {
    const database = await this.databasePromise;

    if (this.destroyed) {
      database.close();
      throw new PersistenceDestroyedError("IndexedDB persistence was destroyed before it synced.");
    }

    this.database = database;

    const { transaction } = await this.fetchUpdates(true);

    await transaction.done;

    if (this.destroyed) {
      throw new PersistenceDestroyedError("IndexedDB persistence was destroyed before it synced.");
    }

    this.synced = true;

    return this;
  };

  private reportError = (error: unknown): void => {
    if (this.destroyed || this.reportedError) return;

    this.reportedError = true;
    this.onError?.(error);
  };

  private storeUpdate = (update: Uint8Array, origin: unknown): void => {
    if (!this.database || origin === this || this.destroyed) return;

    void this.persistUpdate(update).catch(this.reportError);
  };

  private persistUpdate = async (update: Uint8Array): Promise<void> => {
    const database = this.database;

    if (!database || this.destroyed) return;

    await database.add(WORKSPACE_UPDATES_STORE_NAME, {
      entryID: this.entryID,
      update
    } satisfies PersistedUpdate);
    this.databaseSize += 1;

    if (this.databaseSize < PREFERRED_TRIM_SIZE) return;

    if (this.storeTimeoutID !== null) {
      clearTimeout(this.storeTimeoutID);
    }

    this.storeTimeoutID = setTimeout(() => {
      void this.storeState(false).catch(this.reportError);
      this.storeTimeoutID = null;
    }, this.storeTimeout);
  };

  private deleteUpdatesBeforeReference = async (
    updatesStore: PersistenceUpdatesStore
  ): Promise<void> => {
    const updatesIndex = updatesStore.index(WORKSPACE_ENTRY_ID_INDEX_NAME);
    let cursor = await updatesIndex.openKeyCursor(IDBKeyRange.only(this.entryID));

    while (cursor) {
      if (typeof cursor.primaryKey !== "number" || cursor.primaryKey >= this.databaseReference) {
        break;
      }

      await updatesStore.delete(cursor.primaryKey);
      cursor = await cursor.continue();
    }
  };

  async storeState(forceStore = true): Promise<void> {
    if (!this.database || this.destroyed) return;

    const { transaction, updatesStore } = await this.fetchUpdates();

    if (forceStore || this.databaseSize >= PREFERRED_TRIM_SIZE) {
      await updatesStore.add({
        entryID: this.entryID,
        update: Y.encodeStateAsUpdate(this.doc)
      } satisfies PersistedUpdate);
      await this.deleteUpdatesBeforeReference(updatesStore);
      this.databaseSize = await updatesStore
        .index(WORKSPACE_ENTRY_ID_INDEX_NAME)
        .count(this.entryID);
    }

    await transaction.done;
  }

  destroy = async (): Promise<void> => {
    if (this.storeTimeoutID !== null) {
      clearTimeout(this.storeTimeoutID);
    }

    this.doc.off("update", this.storeUpdate);
    this.doc.off("destroy", this.destroy);
    this.destroyed = true;

    const database = await this.databasePromise.catch(() => null);

    this.database = null;
    database?.close();
  };

  async clearData(): Promise<void> {
    await this.destroy();
    await clearDocument(this.name, this.entryID);
  }
}

export { WorkspaceIndexedDBPersistence, clearDocument };
