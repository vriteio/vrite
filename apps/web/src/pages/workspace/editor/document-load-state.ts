import type { EditorProvider } from "@andesine/editor";
import { type Accessor, createEffect, createSignal } from "solid-js";

interface DocumentLoadState {
  documentID: string | null;
  isCheckingLocal: boolean;
  hasLocalSnapshot: boolean;
  localTimeoutCount: number;
  connection: CollaborationConnection;
  authenticated: boolean;
  collaborationReadOnly: boolean;
  problem: CollaborationProblem;
  synced: boolean;
  initialSyncComplete: boolean;
  editorReady: boolean;
  unsyncedChanges: number;
  resettingSchemaContent: boolean;
}

type CollaborationConnection = "connecting" | "connected" | "disconnected";
type CollaborationProblem = "unauthorized" | "failed" | "local-timeout" | null;
type CollaborationScope = "read-write" | "readonly";

const SCHEMA_CONTENT_RESET_CLOSE_CODE = 4210;

const createDocumentLoadState = (
  documentID: string | null,
  localTimeoutCount = 0
): DocumentLoadState => ({
  documentID,
  isCheckingLocal: Boolean(documentID),
  hasLocalSnapshot: false,
  localTimeoutCount,
  connection: "connecting",
  authenticated: false,
  collaborationReadOnly: false,
  problem: null,
  synced: false,
  initialSyncComplete: false,
  editorReady: false,
  unsyncedChanges: 0,
  resettingSchemaContent: false
});
const isPermissionFailure = (reason: string) => {
  return reason === "Unauthorized" || reason === "Forbidden";
};
const useDocumentLoadState = (selectedDocumentID: Accessor<string | undefined>) => {
  const [documentLoadState, setDocumentLoadState] = createSignal<DocumentLoadState>(
    createDocumentLoadState(null)
  );
  const [providerAttempt, setProviderAttempt] = createSignal(0);
  const [discardLocalSnapshot, setDiscardLocalSnapshot] = createSignal(false);

  createEffect(() => {
    setDiscardLocalSnapshot(false);
    setDocumentLoadState(createDocumentLoadState(selectedDocumentID() || null));
  });

  const updateDocumentState = (
    documentID: string,
    update: (state: DocumentLoadState) => DocumentLoadState
  ) => {
    setDocumentLoadState((currentState) => {
      if (currentState.documentID !== documentID) return currentState;

      return update(currentState);
    });
  };
  const setLocalSnapshot = (documentID: string, hasLocalSnapshot: boolean) => {
    updateDocumentState(documentID, (currentState) => ({
      ...currentState,
      isCheckingLocal: false,
      hasLocalSnapshot
    }));
  };
  const setLocalSnapshotTimeout = (documentID: string) => {
    updateDocumentState(documentID, (currentState) => ({
      ...currentState,
      isCheckingLocal: false,
      localTimeoutCount: currentState.localTimeoutCount + 1,
      connection: "disconnected",
      problem: "local-timeout"
    }));
  };
  const setLocalSnapshotFailure = (documentID: string) => {
    updateDocumentState(documentID, (currentState) => ({
      ...currentState,
      isCheckingLocal: false,
      connection: "disconnected",
      problem: "failed"
    }));
  };
  const retryCollaboration = () => {
    const currentState = documentLoadState();
    const collaborationReadOnly = currentState.collaborationReadOnly;
    const resettingSchemaContent = currentState.resettingSchemaContent;

    if (!currentState.documentID) return;

    setDiscardLocalSnapshot(
      resettingSchemaContent ||
        (currentState.problem === "local-timeout" && currentState.localTimeoutCount >= 2)
    );
    setDocumentLoadState({
      ...createDocumentLoadState(currentState.documentID, currentState.localTimeoutCount),
      collaborationReadOnly,
      resettingSchemaContent
    });
    setProviderAttempt((attempt) => attempt + 1);
  };
  const markEditorReady = (documentID: string) => {
    updateDocumentState(documentID, (currentState) => ({
      ...currentState,
      editorReady: true
    }));

    return () => {
      updateDocumentState(documentID, (currentState) => ({
        ...currentState,
        editorReady: false
      }));
    };
  };
  const handleProvider = (provider: EditorProvider) => {
    const documentID = provider.configuration.name;
    const websocketProvider = provider.configuration.websocketProvider;
    const handleAuthenticated = (event: { scope: CollaborationScope }) => {
      updateDocumentState(documentID, (currentState) => ({
        ...currentState,
        authenticated: true,
        collaborationReadOnly: event.scope === "readonly",
        problem: null
      }));
    };
    const handleSynced = (event: { state: boolean }) => {
      updateDocumentState(documentID, (currentState) => ({
        ...currentState,
        synced: event.state,
        initialSyncComplete: currentState.initialSyncComplete || event.state,
        resettingSchemaContent: event.state ? false : currentState.resettingSchemaContent
      }));
    };
    const handleStatus = (event: { status: CollaborationConnection }) => {
      updateDocumentState(documentID, (currentState) => ({
        ...currentState,
        connection: event.status,
        authenticated: event.status === "connected" ? currentState.authenticated : false
      }));
    };
    const handleUnsyncedChanges = (event: { number: number }) => {
      updateDocumentState(documentID, (currentState) => ({
        ...currentState,
        unsyncedChanges: event.number
      }));
    };
    const handleAuthenticationFailed = (event: { reason: string }) => {
      updateDocumentState(documentID, (currentState) => ({
        ...currentState,
        connection: "disconnected",
        problem: isPermissionFailure(event.reason) ? "unauthorized" : "failed"
      }));
    };
    const handleClose = (event: { event: { code: number } }) => {
      if (event.event.code === SCHEMA_CONTENT_RESET_CLOSE_CODE) {
        setDiscardLocalSnapshot(true);
        updateDocumentState(documentID, (currentState) => ({
          ...createDocumentLoadState(documentID, currentState.localTimeoutCount),
          resettingSchemaContent: true
        }));
        setProviderAttempt((attempt) => attempt + 1);
        return;
      }

      updateDocumentState(documentID, (currentState) => {
        let problem = currentState.problem;

        if (event.event.code === 4401 || event.event.code === 4403) {
          problem = "unauthorized";
        } else if (!currentState.initialSyncComplete) {
          problem = "failed";
        }

        return {
          ...currentState,
          connection: "disconnected",
          authenticated: false,
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
    documentLoadState,
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

export { useDocumentLoadState };
export type { CollaborationConnection, CollaborationProblem, DocumentLoadState };
