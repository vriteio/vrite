import { Button, createRef, Skeleton } from "@andesine/components";
import { Component, createEffect, createMemo, Show, Suspense } from "solid-js";
import { Editor, type EditorProvider } from "@andesine/editor";
import { useNavigate, useParams } from "@solidjs/router";
import { useNotify } from "#web/context/notifications";
import { config } from "#web/lib/config";
import { useWorkspace } from "#web/context/workspace";
import { IndexeddbPersistence } from "y-indexeddb";
import {
  deleteIndexedDBDatabase,
  getWorkspaceEntryDatabaseName
} from "#web/context/workspace/persistence";
import {
  CollaborationStatusIndicator,
  type CollaborationStatus
} from "./collaboration-status-indicator";
import { type EntryLoadState, useEntryLoadState } from "./entry-load-state";

const collaborationColors = ["#0ea5e9", "#f97316", "#22c55e", "#eab308", "#ec4899", "#8b5cf6"];
const LOCAL_SNAPSHOT_TIMEOUT = 10_000;

class LocalSnapshotError extends Error {}
class LocalSnapshotTimeoutError extends LocalSnapshotError {}

const withTimeout = <T,>(promise: Promise<T>, timeout: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutID = setTimeout(() => {
      reject(new LocalSnapshotTimeoutError("Local editor data took too long to load."));
    }, timeout);

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
};

const getCollaborationColor = (seed: string) => {
  let hash = 0;

  for (const char of seed) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }

  return collaborationColors[Math.abs(hash) % collaborationColors.length];
};

const getCollaborationStatus = (state: EntryLoadState): CollaborationStatus => {
  if (state.problem === "unauthorized" || state.problem === "failed") return state.problem;
  if (state.unsyncedChanges > 0) {
    return state.connection === "disconnected" ? "offline-changes" : "saved-locally";
  }
  if (state.connection === "connected" && state.synced) return "synced";

  return "connecting";
};

interface EntryLoadErrorProps {
  problem: Exclude<EntryLoadState["problem"], null>;
  localTimeoutCount: number;
  onRetry(): void;
  onBack(): void;
}

const EntryLoadError: Component<EntryLoadErrorProps> = (props) => {
  const isUnauthorized = () => props.problem === "unauthorized";
  const isLocalTimeout = () => props.problem === "local-timeout";

  return (
    <div class="absolute inset-0 z-10 flex items-center justify-center bg-gray-50 px-5 dark:bg-gray-950">
      <div class="flex w-full max-w-sm flex-col gap-4">
        <div>
          <h1 class="text-2xl font-semibold">
            {isUnauthorized()
              ? "Access lost"
              : isLocalTimeout()
                ? "Local content unavailable"
                : "Sync failed"}
          </h1>
          <p class="mt-1 text-sm leading-5 text-gray-400 dark:text-gray-500">
            {isUnauthorized()
              ? "You no longer have access to this entry."
              : isLocalTimeout()
                ? "The editor could not finish loading the local copy of this document."
                : "The editor could not initialize collaboration for this document."}
          </p>
          <Show when={isLocalTimeout() && props.localTimeoutCount >= 2}>
            <p class="mt-2 text-xs leading-5 text-amber-600 dark:text-amber-400">
              The next retry will discard this document’s local content and load the server copy.
            </p>
          </Show>
        </div>
        <Button
          class="w-full"
          color="primary"
          variant="outlined"
          size="large"
          onClick={isUnauthorized() ? props.onBack : props.onRetry}
        >
          {isUnauthorized() ? "Back" : "Retry"}
        </Button>
      </div>
    </div>
  );
};

const EntryContentSkeleton: Component = () => {
  return (
    <div class="absolute inset-0 z-10 bg-gray-50 dark:bg-gray-950">
      <div class="relative mx-auto flex w-full max-w-[44rem] flex-col gap-2 px-5 py-8">
        <Skeleton
          class={["h-12 w-4/5", "h-32 w-full", "h-24 w-full", "h-8 w-3/5", "h-40 w-full"]}
        />
        <div
          class="pointer-events-none absolute inset-0 text-gray-50 dark:text-gray-950"
          style={{ background: "linear-gradient(to bottom, transparent 15%, currentColor 100%)" }}
        />
      </div>
    </div>
  );
};

const EditorPane: Component = () => {
  const { currentWorkspace, currentSession, content, hasPermission } = useWorkspace();
  const isContentLoading = () => content.loading();
  const params = useParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const selectedEntryID = () => params.slug;
  const availableEntryID = createMemo(() => {
    const entryID = selectedEntryID();

    if (!entryID) return null;

    return content.entriesCollection().findOne({ id: entryID })?.id ?? null;
  });
  const editableEntryID = createMemo(() => {
    return hasPermission("content") ? availableEntryID() : null;
  });
  const workspaceID = () => params.workspaceID || currentWorkspace()?.id || "unknown";
  const [openedEntryID, setOpenedEntryID] = createRef<string | null>(null);
  const {
    entryLoadState,
    providerAttempt,
    discardLocalSnapshot,
    setLocalSnapshot,
    setLocalSnapshotTimeout,
    setLocalSnapshotFailure,
    retryCollaboration,
    markEditorReady,
    handleProvider
  } = useEntryLoadState(selectedEntryID);
  const collaborationStatus = () => getCollaborationStatus(entryLoadState());
  const isShowingContentSkeleton = () => {
    const entryID = selectedEntryID();
    const currentState = entryLoadState();

    return Boolean(
      entryID &&
      currentState.entryID === entryID &&
      !currentState.isCheckingLocal &&
      !currentState.hasLocalSnapshot &&
      !currentState.editorReady &&
      !currentState.problem
    );
  };
  const handleBeforeProviderAttach = async (provider: EditorProvider) => {
    const entryID = provider.configuration.name;
    const currentWorkspaceID = workspaceID();
    const databaseName = getWorkspaceEntryDatabaseName(currentWorkspaceID, entryID);
    let persistence: IndexeddbPersistence | null = null;

    try {
      if (discardLocalSnapshot()) {
        await withTimeout(deleteIndexedDBDatabase(databaseName), LOCAL_SNAPSHOT_TIMEOUT);
      }

      persistence = new IndexeddbPersistence(databaseName, provider.document);
      await withTimeout(persistence.whenSynced, LOCAL_SNAPSHOT_TIMEOUT);

      const hasLocalSnapshot = provider.document.store.clients.size > 0;

      setLocalSnapshot(entryID, hasLocalSnapshot);

      return {
        renderImmediately: hasLocalSnapshot,
        cleanup() {
          void persistence?.destroy();
        }
      };
    } catch (error) {
      void persistence?.destroy();

      if (error instanceof LocalSnapshotTimeoutError) {
        setLocalSnapshotTimeout(entryID);
      } else {
        setLocalSnapshotFailure(entryID);
        notify({ type: "error", text: "Failed to load local editor data." });
      }

      throw error instanceof LocalSnapshotError
        ? error
        : new LocalSnapshotError("Failed to load local editor data.", { cause: error });
    }
  };

  const collaborationUser = () => {
    const session = currentSession();
    const user = session?.user;
    const name = user?.name || user?.email || "Anonymous";
    const id = user?.id || name;

    return {
      name,
      color: getCollaborationColor(id)
    };
  };

  createEffect(() => {
    const selectedID = selectedEntryID();
    const availableID = availableEntryID();

    if (availableID) {
      setOpenedEntryID(availableID);
    } else if (selectedID && openedEntryID() === selectedID && !isContentLoading()) {
      setOpenedEntryID(null);
      navigate(`/${workspaceID()}`, { replace: true });
    }
  });

  return (
    <div class="flex flex-1 px-1 overflow-hidden w-full">
      <Show
        when={selectedEntryID()}
        fallback={
          <div class="flex flex-col items-center justify-center gap-2 h-full w-full">
            <div class="i-lucide:file-pen text-gray-200 h-12 w-12" />
            <span class="text-xs text-gray-300 dark:text-gray-600">
              Select an entry to start editing
            </span>
          </div>
        }
      >
        <Show
          when={availableEntryID()}
          keyed
          fallback={
            <Show
              when={isContentLoading()}
              fallback={
                <div class="flex flex-col items-center justify-center gap-2 h-full w-full">
                  <div class="i-lucide:file-x text-gray-200 h-12 w-12" />
                  <span class="text-xs text-gray-300 dark:text-gray-600">Entry not found</span>
                </div>
              }
            >
              <div class="relative h-full w-full overflow-hidden">
                <EntryContentSkeleton />
              </div>
            </Show>
          }
        >
          {(entryID) => (
            <div class="relative flex h-full w-full overflow-hidden">
              <Show when={isShowingContentSkeleton()}>
                <EntryContentSkeleton />
              </Show>
              <Show when={entryLoadState().problem} keyed>
                {(problem) => (
                  <EntryLoadError
                    problem={problem}
                    localTimeoutCount={entryLoadState().localTimeoutCount}
                    onRetry={retryCollaboration}
                    onBack={() => navigate(`/${workspaceID()}`)}
                  />
                )}
              </Show>
              <Show when={!entryLoadState().isCheckingLocal && !entryLoadState().problem}>
                <CollaborationStatusIndicator
                  status={collaborationStatus()}
                  hasLocalSnapshot={entryLoadState().hasLocalSnapshot}
                  onRetry={retryCollaboration}
                  onBack={() => navigate(`/${workspaceID()}`)}
                />
              </Show>
              <div class="h-full w-full" classList={{ invisible: !entryLoadState().editorReady }}>
                <Suspense fallback={<Skeleton />}>
                  <Editor
                    doc={entryID}
                    url={`${config.PUBLIC_WS_API_URL}/collab`}
                    providerAttempt={providerAttempt()}
                    editable={editableEntryID() === entryID}
                    notify={(type, text) => notify({ type, text })}
                    collaborationUser={collaborationUser()}
                    beforeProviderAttach={handleBeforeProviderAttach}
                    onProvider={handleProvider}
                    onProviderSetupError={(error) => {
                      if (!(error instanceof LocalSnapshotError)) {
                        setLocalSnapshotFailure(entryID);
                      }
                    }}
                    onEditor={() => markEditorReady(entryID)}
                    onTitleChange={(title) => {
                      const entries = content.entriesCollection();
                      const entry = entries.findOne({ id: entryID }, { reactive: false });

                      if (entry && entry.name !== title) {
                        entries.updateOne({ id: entryID }, { $set: { name: title } });
                      }
                    }}
                  />
                </Suspense>
              </div>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
};

export { EditorPane };
