import type { EditorProvider } from "@andesine/editor";
import { type Accessor, createEffect, createSignal } from "solid-js";

type CollaborationConnection = "connecting" | "connected" | "disconnected";
type CollaborationProblem = "unauthorized" | "failed" | "local-timeout" | null;

type EntryLoadState = {
  entryID: string | null;
  isCheckingLocal: boolean;
  hasLocalSnapshot: boolean;
  localTimeoutCount: number;
  connection: CollaborationConnection;
  authenticated: boolean;
  problem: CollaborationProblem;
  synced: boolean;
  initialSyncComplete: boolean;
  editorReady: boolean;
  unsyncedChanges: number;
};

const createEntryLoadState = (entryID: string | null, localTimeoutCount = 0): EntryLoadState => ({
  entryID,
  isCheckingLocal: Boolean(entryID),
  hasLocalSnapshot: false,
  localTimeoutCount,
  connection: "connecting",
  authenticated: false,
  problem: null,
  synced: false,
  initialSyncComplete: false,
  editorReady: false,
  unsyncedChanges: 0
});

const isPermissionFailure = (reason: string) => {
  return reason === "Unauthorized" || reason === "Forbidden";
};

const useEntryLoadState = (selectedEntryID: Accessor<string | undefined>) => {
  const [entryLoadState, setEntryLoadState] = createSignal<EntryLoadState>(
    createEntryLoadState(null)
  );
  const [providerAttempt, setProviderAttempt] = createSignal(0);
  const [discardLocalSnapshot, setDiscardLocalSnapshot] = createSignal(false);

  createEffect(() => {
    setDiscardLocalSnapshot(false);
    setEntryLoadState(createEntryLoadState(selectedEntryID() || null));
  });

  const updateEntryState = (entryID: string, update: (state: EntryLoadState) => EntryLoadState) => {
    setEntryLoadState((currentState) => {
      if (currentState.entryID !== entryID) return currentState;

      return update(currentState);
    });
  };

  const setLocalSnapshot = (entryID: string, hasLocalSnapshot: boolean) => {
    updateEntryState(entryID, (currentState) => ({
      ...currentState,
      isCheckingLocal: false,
      hasLocalSnapshot
    }));
  };

  const setLocalSnapshotTimeout = (entryID: string) => {
    updateEntryState(entryID, (currentState) => ({
      ...currentState,
      isCheckingLocal: false,
      localTimeoutCount: currentState.localTimeoutCount + 1,
      connection: "disconnected",
      problem: "local-timeout"
    }));
  };

  const setLocalSnapshotFailure = (entryID: string) => {
    updateEntryState(entryID, (currentState) => ({
      ...currentState,
      isCheckingLocal: false,
      connection: "disconnected",
      problem: "failed"
    }));
  };

  const retryCollaboration = () => {
    const currentState = entryLoadState();

    if (!currentState.entryID) return;

    setDiscardLocalSnapshot(
      currentState.problem === "local-timeout" && currentState.localTimeoutCount >= 2
    );
    setEntryLoadState(createEntryLoadState(currentState.entryID, currentState.localTimeoutCount));
    setProviderAttempt((attempt) => attempt + 1);
  };

  const markEditorReady = (entryID: string) => {
    updateEntryState(entryID, (currentState) => ({
      ...currentState,
      editorReady: true
    }));

    return () => {
      updateEntryState(entryID, (currentState) => ({
        ...currentState,
        editorReady: false
      }));
    };
  };

  const handleProvider = (provider: EditorProvider) => {
    const entryID = provider.configuration.name;
    const websocketProvider = provider.configuration.websocketProvider;
    const handleAuthenticated = () => {
      updateEntryState(entryID, (currentState) => ({
        ...currentState,
        authenticated: true,
        problem: null
      }));
    };
    const handleSynced = (event: { state: boolean }) => {
      updateEntryState(entryID, (currentState) => ({
        ...currentState,
        synced: event.state,
        initialSyncComplete: currentState.initialSyncComplete || event.state
      }));
    };
    const handleStatus = (event: { status: CollaborationConnection }) => {
      updateEntryState(entryID, (currentState) => ({
        ...currentState,
        connection: event.status
      }));
    };
    const handleUnsyncedChanges = (event: { number: number }) => {
      updateEntryState(entryID, (currentState) => ({
        ...currentState,
        unsyncedChanges: event.number
      }));
    };
    const handleAuthenticationFailed = (event: { reason: string }) => {
      updateEntryState(entryID, (currentState) => ({
        ...currentState,
        connection: "disconnected",
        problem: isPermissionFailure(event.reason) ? "unauthorized" : "failed"
      }));
    };
    const handleClose = (event: { event: { code: number } }) => {
      updateEntryState(entryID, (currentState) => {
        let problem = currentState.problem;

        if (event.event.code === 4401 || event.event.code === 4403) {
          problem = "unauthorized";
        } else if (!currentState.initialSyncComplete) {
          problem = "failed";
        }

        return {
          ...currentState,
          connection: "disconnected",
          problem
        };
      });
    };

    handleSynced({ state: provider.synced });
    handleUnsyncedChanges({ number: provider.unsyncedChanges });

    if (websocketProvider.status !== "disconnected") {
      handleStatus({ status: websocketProvider.status });
    }

    provider.on("authenticated", handleAuthenticated);
    provider.on("synced", handleSynced);
    provider.on("status", handleStatus);
    provider.on("unsyncedChanges", handleUnsyncedChanges);
    provider.on("authenticationFailed", handleAuthenticationFailed);
    provider.on("close", handleClose);

    return () => {
      provider.off("authenticated", handleAuthenticated);
      provider.off("synced", handleSynced);
      provider.off("status", handleStatus);
      provider.off("unsyncedChanges", handleUnsyncedChanges);
      provider.off("authenticationFailed", handleAuthenticationFailed);
      provider.off("close", handleClose);
    };
  };

  return {
    entryLoadState,
    providerAttempt,
    discardLocalSnapshot,
    setLocalSnapshot,
    setLocalSnapshotTimeout,
    setLocalSnapshotFailure,
    retryCollaboration,
    markEditorReady,
    handleProvider
  };
};

export { useEntryLoadState };
export type { CollaborationConnection, CollaborationProblem, EntryLoadState };
