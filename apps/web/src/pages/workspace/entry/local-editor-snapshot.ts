import type { EditorProvider } from "@andesine/editor";
import { IndexeddbPersistence } from "y-indexeddb";
import {
  deleteIndexedDBDatabase,
  getWorkspaceEntryDatabaseName
} from "#web/context/workspace/persistence";

const LOCAL_SNAPSHOT_TIMEOUT = 10_000;

class LocalSnapshotError extends Error {}
class LocalSnapshotTimeoutError extends LocalSnapshotError {}

const withTimeout = <T>(promise: Promise<T>, timeout: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timeoutID = setTimeout(
      () => reject(new LocalSnapshotTimeoutError("Local editor data took too long to load.")),
      timeout
    );
    promise.then(
      (value) => {
        clearTimeout(timeoutID);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutID);
        reject(error);
      }
    );
  });

interface LocalEditorSnapshotInput {
  workspaceID(): string;
  discardLocalSnapshot(): boolean;
  setLocalSnapshot(entryID: string, available: boolean): void;
  setLocalSnapshotTimeout(entryID: string): void;
  setLocalSnapshotFailure(entryID: string): void;
  notifyError(text: string): void;
}

const createLocalEditorSnapshotLifecycle = (input: LocalEditorSnapshotInput) => {
  const beforeProviderAttach = async (provider: EditorProvider) => {
    const entryID = provider.configuration.name;
    const databaseName = getWorkspaceEntryDatabaseName(input.workspaceID(), entryID);
    let persistence: IndexeddbPersistence | null = null;

    try {
      if (input.discardLocalSnapshot()) {
        await withTimeout(deleteIndexedDBDatabase(databaseName), LOCAL_SNAPSHOT_TIMEOUT);
      }
      persistence = new IndexeddbPersistence(databaseName, provider.document);
      await withTimeout(persistence.whenSynced, LOCAL_SNAPSHOT_TIMEOUT);

      const available = provider.document.store.clients.size > 0;
      input.setLocalSnapshot(entryID, available);
      return {
        renderImmediately: available,
        cleanup() {
          void persistence?.destroy();
        }
      };
    } catch (error) {
      void persistence?.destroy();
      if (error instanceof LocalSnapshotTimeoutError) {
        input.setLocalSnapshotTimeout(entryID);
      } else {
        input.setLocalSnapshotFailure(entryID);
        input.notifyError("Failed to load local editor data.");
      }
      throw error instanceof LocalSnapshotError
        ? error
        : new LocalSnapshotError("Failed to load local editor data.", { cause: error });
    }
  };

  return { beforeProviderAttach };
};

export { createLocalEditorSnapshotLifecycle, LocalSnapshotError };
