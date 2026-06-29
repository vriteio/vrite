import { Card, Skeleton, Spinner, Tooltip } from "@andesine/components";
import { Component, createEffect, createSignal, Show, Suspense } from "solid-js";
import { Editor, type EditorProvider } from "@andesine/editor";
import { useParams } from "@solidjs/router";
import { useNotify } from "#web/context/notifications";
import { config } from "#web/lib/config";
import { useWorkspace } from "#web/context/workspace";
import { IndexeddbPersistence } from "y-indexeddb";

type EntryLoadState = {
  entryID: string | null;
  isCheckingLocal: boolean;
  hasLocalSnapshot: boolean;
  isRemoteSyncing: boolean;
};

const collaborationColors = ["#0ea5e9", "#f97316", "#22c55e", "#eab308", "#ec4899", "#8b5cf6"];

const getCollaborationColor = (seed: string) => {
  let hash = 0;

  for (const char of seed) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }

  return collaborationColors[Math.abs(hash) % collaborationColors.length];
};

const createEntryLoadState = (
  entryID: string | null,
  options?: { hasKnownLocalSnapshot?: boolean }
): EntryLoadState => {
  const hasKnownLocalSnapshot = options?.hasKnownLocalSnapshot ?? false;

  return {
    entryID,
    isCheckingLocal: Boolean(entryID) && !hasKnownLocalSnapshot,
    hasLocalSnapshot: hasKnownLocalSnapshot,
    isRemoteSyncing: hasKnownLocalSnapshot
  };
};

const getEntryPersistenceKey = (workspaceID: string, entryID: string) => {
  return `andesine:entry:${workspaceID}:${entryID}`;
};

const getEntryPersistenceHintKey = (workspaceID: string, entryID: string) => {
  return `${getEntryPersistenceKey(workspaceID, entryID)}:has-local-snapshot`;
};

const hasKnownLocalSnapshot = (workspaceID: string, entryID: string) => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(getEntryPersistenceHintKey(workspaceID, entryID)) === "1";
};

const setKnownLocalSnapshot = (workspaceID: string, entryID: string, value: boolean) => {
  if (typeof window === "undefined") {
    return;
  }

  const key = getEntryPersistenceHintKey(workspaceID, entryID);

  if (value) {
    window.localStorage.setItem(key, "1");
    return;
  }

  window.localStorage.removeItem(key);
};

const EntryContentSkeleton: Component = () => {
  return (
    <div class="absolute inset-0 z-10 bg-gray-50 dark:bg-gray-950">
      <div class="mx-auto flex h-full w-full max-w-[44rem] flex-col gap-4 px-5 py-8 animate-pulse">
        <div class="h-9 w-3/5 rounded-xl bg-gray-200 dark:bg-gray-800" />
        <div class="h-4 w-full rounded-full bg-gray-100 dark:bg-gray-900" />
        <div class="h-4 w-11/12 rounded-full bg-gray-100 dark:bg-gray-900" />
        <div class="h-4 w-4/5 rounded-full bg-gray-100 dark:bg-gray-900" />
        <div class="h-4 w-full rounded-full bg-gray-100 dark:bg-gray-900" />
        <div class="h-4 w-10/12 rounded-full bg-gray-100 dark:bg-gray-900" />
        <div class="h-32 w-full rounded-2xl bg-gray-100 dark:bg-gray-900" />
        <div class="h-4 w-3/4 rounded-full bg-gray-100 dark:bg-gray-900" />
        <div class="h-4 w-full rounded-full bg-gray-100 dark:bg-gray-900" />
        <div class="h-4 w-5/6 rounded-full bg-gray-100 dark:bg-gray-900" />
      </div>
    </div>
  );
};

const EditorPane: Component = () => {
  const { currentWorkspace, sessions, content } = useWorkspace();
  const isContentLoading = () => content.loading();
  const params = useParams();
  const notify = useNotify();
  const [entryLoadState, setEntryLoadState] = createSignal<EntryLoadState>(
    createEntryLoadState(null)
  );
  const selectedEntryID = () => params.slug;
  const workspaceID = () => params.workspaceID || currentWorkspace()?.id || "unknown";
  const isShowingContentSkeleton = () => {
    const entryID = selectedEntryID();
    const currentState = entryLoadState();

    return Boolean(
      entryID &&
      currentState.entryID === entryID &&
      (currentState.isCheckingLocal ||
        (!currentState.hasLocalSnapshot && currentState.isRemoteSyncing))
    );
  };
  const isRemoteSyncing = () => {
    const entryID = selectedEntryID();
    const currentState = entryLoadState();

    return Boolean(
      entryID &&
      currentState.entryID === entryID &&
      currentState.hasLocalSnapshot &&
      currentState.isRemoteSyncing
    );
  };

  createEffect(() => {
    const entryID = selectedEntryID();

    if (!entryID) {
      setEntryLoadState(createEntryLoadState(null));
      return;
    }

    setEntryLoadState(
      createEntryLoadState(entryID, {
        hasKnownLocalSnapshot: hasKnownLocalSnapshot(workspaceID(), entryID)
      })
    );
  });

  const handleBeforeProviderAttach = async (provider: EditorProvider) => {
    const entryID = provider.configuration.name;
    const currentWorkspaceID = workspaceID();
    const persistence = new IndexeddbPersistence(
      getEntryPersistenceKey(currentWorkspaceID, entryID),
      provider.document
    );

    try {
      await persistence.whenSynced;
    } catch {
      notify({ type: "error", text: "Failed to load local editor data." });
    }

    const hasLocalSnapshot = provider.document.store.clients.size > 0;

    setKnownLocalSnapshot(currentWorkspaceID, entryID, hasLocalSnapshot);

    setEntryLoadState((currentState) => {
      if (currentState.entryID !== entryID) {
        return currentState;
      }

      return {
        entryID,
        isCheckingLocal: false,
        hasLocalSnapshot,
        isRemoteSyncing: !hasLocalSnapshot
      };
    });

    return () => {
      void persistence.destroy();
    };
  };

  const handleProvider = (provider: EditorProvider) => {
    const docID = provider.configuration.name;
    const currentWorkspaceID = workspaceID();

    const handleSynced = (event: { state: boolean }) => {
      if (event.state) {
        setKnownLocalSnapshot(currentWorkspaceID, docID, true);
      }

      setEntryLoadState((currentState) => {
        if (currentState.entryID !== docID) {
          return currentState;
        }

        return {
          ...currentState,
          isRemoteSyncing: !event.state
        };
      });
    };

    handleSynced({ state: provider.synced });

    provider.on("synced", handleSynced);

    return () => {
      provider.off("synced", handleSynced);
    };
  };
  const collaborationUser = () => {
    const workspace = currentWorkspace();
    const user = workspace
      ? sessions().find((session) => session.user.id === workspace.userID)?.user
      : null;
    const name = user?.name || user?.email || "Anonymous";
    const id = user?.id || name;

    return {
      name,
      color: getCollaborationColor(id)
    };
  };

  return (
    <Card
      class="flex justify-center items-center flex-col flex-1 h-full p-0 overflow-hidden relative"
      shade
    >
      <div class="flex h-11 gap-2 p-2 pl-4 w-full items-center justify-center">
        {selectedEntryID() ? (
          <>
            <span class="text-base font-medium inline-flex items-center justify-center leading-[1]">
              <Tooltip content="Workspace" fixed>
                <span class="i-lucide:hexagon h-5 w-5" />
              </Tooltip>
              <span class="text-gray-400 i-lucide:chevron-right h-4 w-4"></span>
              {/* TODO: Use selected entry name */}
              <span>{selectedEntryID()}</span>
            </span>
            <div class="flex-1" />
          </>
        ) : (
          <div class="flex-1" />
        )}
      </div>
      <div class="flex flex-1 px-4 overflow-hidden w-full">
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
            when={selectedEntryID()}
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
                <Show when={isRemoteSyncing()}>
                  <div class="absolute bottom-4 right-4 z-20 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/95 px-3 py-1.5 text-xs text-sky-700 shadow-sm dark:border-sky-900 dark:bg-gray-950/95 dark:text-sky-300">
                    <Spinner class="h-3.5 w-3.5" color="primary" />
                    <span>Syncing</span>
                  </div>
                </Show>
                <Suspense fallback={<Skeleton />}>
                  <Editor
                    doc={entryID}
                    url={`${config.PUBLIC_WS_API_URL}/collab`}
                    notify={(type, text) => notify({ type, text })}
                    collaborationUser={collaborationUser()}
                    beforeProviderAttach={handleBeforeProviderAttach}
                    onProvider={handleProvider}
                  />
                </Suspense>
              </div>
            )}
          </Show>
        </Show>
      </div>
    </Card>
  );
};

export { EditorPane };
