import { createRef, Skeleton } from "@andesine/components";
import { type Component, createEffect, createMemo, Show, Suspense } from "solid-js";
import { Editor } from "@andesine/editor";
import { useNavigate, useParams } from "@solidjs/router";
import { useNotify } from "#web/context/notifications";
import { config } from "#web/lib/api";
import { useWorkspace } from "#web/context/workspace";
import { CollaborationStatusIndicator } from "./collaboration-status-indicator";
import { useEntryLoadState } from "./entry-load-state";
import { getCollaborationStatus, getCollaborationUser } from "./editor-collaboration";
import { EntryContentSkeleton, EntryLoadError } from "./editor-pane-states";
import { createLocalEditorSnapshotLifecycle, LocalSnapshotError } from "./local-editor-snapshot";

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
  const { beforeProviderAttach } = createLocalEditorSnapshotLifecycle({
    workspaceID,
    discardLocalSnapshot,
    setLocalSnapshot,
    setLocalSnapshotTimeout,
    setLocalSnapshotFailure,
    notifyError: (text) => notify({ type: "error", text })
  });

  const collaborationUser = () => getCollaborationUser(currentSession()?.user);

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
    <div class="flex flex-1 overflow-hidden w-full">
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
              <div
                class="h-full w-full px-1"
                classList={{ invisible: !entryLoadState().editorReady }}
              >
                <Suspense>
                  <Editor
                    doc={entryID}
                    url={`${config.PUBLIC_WS_API_URL}/collab`}
                    providerAttempt={providerAttempt()}
                    editable={editableEntryID() === entryID}
                    notify={(type, text) => notify({ type, text })}
                    collaborationUser={collaborationUser()}
                    beforeProviderAttach={beforeProviderAttach}
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
