import type { EditorProvider } from "@andesine/editor";
import { getWorkspaceDatabaseName } from "#web/context/workspace/indexeddb";
import { clearDocument, WorkspaceIndexedDBPersistence } from "#web/context/workspace/y-indexeddb";

const LOCAL_SNAPSHOT_TIMEOUT = 10_000;

class LocalSnapshotError extends Error {}
class LocalSnapshotTimeoutError extends LocalSnapshotError {}
class LocalSnapshotAbortError extends LocalSnapshotError {}

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
const isAbortError = (error: unknown): boolean => {
  return error instanceof Error && error.name === "AbortError";
};

interface LocalEditorSnapshotInput {
  workspaceID(): string;
  discardLocalSnapshot(): boolean;
  setLocalSnapshot(documentID: string, available: boolean): void;
  setLocalSnapshotTimeout(documentID: string): void;
  setLocalSnapshotFailure(documentID: string): void;
  notifyError(text: string): void;
}

const createLocalEditorSnapshotLifecycle = (input: LocalEditorSnapshotInput) => {
  const beforeProviderAttach = async (provider: EditorProvider) => {
    const documentID = provider.configuration.name;
    const databaseName = getWorkspaceDatabaseName(input.workspaceID());

    let persistence: WorkspaceIndexedDBPersistence | null = null;

    try {
      if (input.discardLocalSnapshot()) {
        await withTimeout(clearDocument(databaseName, documentID), LOCAL_SNAPSHOT_TIMEOUT);
      }
      persistence = new WorkspaceIndexedDBPersistence(databaseName, documentID, provider.document, {
        onError() {
          input.setLocalSnapshotFailure(documentID);
          input.notifyError("Failed to save local editor data.");
        }
      });
      await withTimeout(persistence.whenSynced, LOCAL_SNAPSHOT_TIMEOUT);

      const available = provider.document.store.clients.size > 0;
      input.setLocalSnapshot(documentID, available);
      return {
        renderImmediately: available,
        cleanup() {
          void persistence?.destroy();
        }
      };
    } catch (error) {
      void persistence?.destroy();

      if (isAbortError(error)) {
        throw new LocalSnapshotAbortError("Local editor data loading was aborted.", {
          cause: error
        });
      } else if (error instanceof LocalSnapshotTimeoutError) {
        input.setLocalSnapshotTimeout(documentID);
      } else {
        input.setLocalSnapshotFailure(documentID);
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
