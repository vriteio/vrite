import { createRef, Skeleton } from "@andesine/components";
import { Component, createEffect, createMemo, Show, Suspense } from "solid-js";
import { Editor, type EditorProvider } from "@andesine/editor";
import { useNavigate, useParams } from "@solidjs/router";
import { useNotify } from "#web/context/notifications";
import { config } from "#web/lib/config";
import { useWorkspace } from "#web/context/workspace";
import { IndexeddbPersistence } from "y-indexeddb";
import { getWorkspaceEntryDatabaseName } from "#web/context/workspace/persistence";
import {
  CollaborationStatusIndicator,
  type CollaborationStatus
} from "./collaboration-status-indicator";
import { type EntryLoadState, useEntryLoadState } from "./entry-load-state";

const collaborationColors = ["#0ea5e9", "#f97316", "#22c55e", "#eab308", "#ec4899", "#8b5cf6"];

const getCollaborationColor = (seed: string) => {
  let hash = 0;

  for (const char of seed) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }

  return collaborationColors[Math.abs(hash) % collaborationColors.length];
};

const getCollaborationStatus = (state: EntryLoadState): CollaborationStatus => {
  if (state.problem) return state.problem;
  if (state.unsyncedChanges > 0) {
    return state.connection === "disconnected" ? "offline-changes" : "saved-locally";
  }
  if (state.connection === "connected" && state.synced) return "synced";

  return "connecting";
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
  const { entryLoadState, setLocalSnapshot, retryCollaboration, handleProvider } =
    useEntryLoadState(selectedEntryID);
  const collaborationStatus = () => getCollaborationStatus(entryLoadState());
  const isShowingContentSkeleton = () => {
    const entryID = selectedEntryID();
    const currentState = entryLoadState();

    return Boolean(
      entryID &&
      currentState.entryID === entryID &&
      !currentState.isCheckingLocal &&
      !currentState.hasLocalSnapshot &&
      collaborationStatus() === "connecting"
    );
  };
  const handleBeforeProviderAttach = async (provider: EditorProvider) => {
    const entryID = provider.configuration.name;
    const currentWorkspaceID = workspaceID();
    const persistence = new IndexeddbPersistence(
      getWorkspaceEntryDatabaseName(currentWorkspaceID, entryID),
      provider.document
    );

    try {
      await persistence.whenSynced;
    } catch {
      notify({ type: "error", text: "Failed to load local editor data." });
    }

    const hasLocalSnapshot = provider.document.store.clients.size > 0;

    setLocalSnapshot(entryID, hasLocalSnapshot);

    return () => {
      persistence.destroy();
    };
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
              <Show when={!entryLoadState().isCheckingLocal}>
                <CollaborationStatusIndicator
                  status={collaborationStatus()}
                  hasLocalSnapshot={entryLoadState().hasLocalSnapshot}
                  onRetry={retryCollaboration}
                  onBack={() => navigate(`/${workspaceID()}`)}
                />
              </Show>
              <div
                class="h-full w-full"
                classList={{ invisible: entryLoadState().isCheckingLocal }}
              >
                <Suspense fallback={<Skeleton />}>
                  <Editor
                    doc={entryID}
                    url={`${config.PUBLIC_WS_API_URL}/collab`}
                    editable={editableEntryID() === entryID}
                    notify={(type, text) => notify({ type, text })}
                    collaborationUser={collaborationUser()}
                    beforeProviderAttach={handleBeforeProviderAttach}
                    onProvider={handleProvider}
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
