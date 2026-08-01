import type { EditorProvider } from "@andesine/editor";
import { Accessor, createEffect, createSignal } from "solid-js";

type CollaborationConnection = "connecting" | "connected" | "disconnected";
type CollaborationProblem = "unauthorized" | "failed" | null;

type EntryLoadState = {
  entryID: string | null;
  isCheckingLocal: boolean;
  hasLocalSnapshot: boolean;
  connection: CollaborationConnection;
  problem: CollaborationProblem;
  synced: boolean;
  unsyncedChanges: number;
};

const createEntryLoadState = (entryID: string | null): EntryLoadState => {
  return {
    entryID,
    isCheckingLocal: Boolean(entryID),
    hasLocalSnapshot: false,
    connection: "connecting",
    problem: null,
    synced: false,
    unsyncedChanges: 0
  };
};

const useEntryLoadState = (selectedEntryID: Accessor<string | undefined>) => {
  const [activeProvider, setActiveProvider] = createSignal<EditorProvider | null>(null);
  const [entryLoadState, setEntryLoadState] = createSignal<EntryLoadState>(
    createEntryLoadState(null)
  );

  createEffect(() => {
    setEntryLoadState(createEntryLoadState(selectedEntryID() || null));
  });

  const setLocalSnapshot = (entryID: string, hasLocalSnapshot: boolean) => {
    setEntryLoadState((currentState) => {
      if (currentState.entryID !== entryID) return currentState;

      return {
        ...currentState,
        isCheckingLocal: false,
        hasLocalSnapshot
      };
    });
  };

  const retryCollaboration = () => {
    const provider = activeProvider();

    if (!provider) return;

    const entryID = provider.configuration.name;

    setEntryLoadState((currentState) => ({
      ...currentState,
      connection: "connecting",
      problem: null,
      synced: false
    }));
    void provider.configuration.websocketProvider.connect().catch(() => {
      setEntryLoadState((currentState) => {
        if (currentState.entryID !== entryID) return currentState;

        return {
          ...currentState,
          connection: "disconnected",
          problem: "failed"
        };
      });
    });
  };

  const handleProvider = (provider: EditorProvider) => {
    const entryID = provider.configuration.name;
    const websocketProvider = provider.configuration.websocketProvider;

    const handleSynced = (event: { state: boolean }) => {
      setEntryLoadState((currentState) => {
        if (currentState.entryID !== entryID) return currentState;

        return {
          ...currentState,
          synced: event.state
        };
      });
    };
    const handleStatus = (event: { status: CollaborationConnection }) => {
      setEntryLoadState((currentState) => {
        if (currentState.entryID !== entryID) return currentState;

        return {
          ...currentState,
          connection: event.status,
          problem: event.status === "connected" ? null : currentState.problem
        };
      });
    };
    const handleUnsyncedChanges = (event: { number: number }) => {
      setEntryLoadState((currentState) => {
        if (currentState.entryID !== entryID) return currentState;

        return {
          ...currentState,
          unsyncedChanges: event.number
        };
      });
    };
    const handleAuthenticationFailed = () => {
      setEntryLoadState((currentState) => {
        if (currentState.entryID !== entryID) return currentState;

        return {
          ...currentState,
          problem: "unauthorized"
        };
      });
    };
    const handleClose = (event: { event: { code: number } }) => {
      setEntryLoadState((currentState) => {
        if (currentState.entryID !== entryID) return currentState;

        let problem = currentState.problem;

        if (event.event.code === 4401 || event.event.code === 4403) {
          problem = "unauthorized";
        } else if (event.event.code >= 4000 && event.event.code < 5000) {
          problem = "failed";
        }

        return {
          ...currentState,
          connection: "disconnected",
          problem
        };
      });
    };

    setActiveProvider(provider);
    handleSynced({ state: provider.synced });
    handleStatus({ status: websocketProvider.status });
    handleUnsyncedChanges({ number: provider.unsyncedChanges });

    provider.on("synced", handleSynced);
    provider.on("status", handleStatus);
    provider.on("unsyncedChanges", handleUnsyncedChanges);
    provider.on("authenticationFailed", handleAuthenticationFailed);
    provider.on("close", handleClose);

    return () => {
      setActiveProvider((currentProvider) =>
        currentProvider === provider ? null : currentProvider
      );
      provider.off("synced", handleSynced);
      provider.off("status", handleStatus);
      provider.off("unsyncedChanges", handleUnsyncedChanges);
      provider.off("authenticationFailed", handleAuthenticationFailed);
      provider.off("close", handleClose);
    };
  };

  return {
    entryLoadState,
    setLocalSnapshot,
    retryCollaboration,
    handleProvider
  };
};

export { useEntryLoadState };
export type { CollaborationConnection, CollaborationProblem, EntryLoadState };
