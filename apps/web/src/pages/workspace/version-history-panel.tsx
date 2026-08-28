import { Button, DropdownArea, DropdownMenu, IconButton } from "@andesine/components";
import { createAsync, revalidate, useParams, useSearchParams } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  onCleanup,
  Show,
  Suspense,
  useTransition
} from "solid-js";
import { TREE_ROOT_ID, Tree, type TreeMap } from "#web/components/tree";
import { useLayout } from "#web/context/layout";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { client } from "#web/lib/api";
import {
  entryDraftQuery,
  versionDetailsQuery,
  versionHistoryQuery,
  type VersionListPage,
  type VersionSummary
} from "#web/lib/data";
import { CreateVersionDialog, RevertVersionDialog } from "./version-dialogs";
import { VersionHistoryItem } from "./version-history-item";
import { VERSION_ITEM_HEIGHT, VersionHistorySkeleton } from "./version-history-skeleton";
import { useVersionPublishing } from "./use-version-publishing";
import clsx from "clsx";

interface VersionHistoryPanelProps {
  opened?: boolean;
}

const VersionHistoryPanel: Component<VersionHistoryPanelProps> = (props) => {
  const params = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { layout } = useLayout();
  const { content, subscribeToUpdates } = useWorkspace();
  const notify = useNotify();
  const [additionalPages, setAdditionalPages] = createSignal<VersionListPage[]>([]);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [createDialogOpened, setCreateDialogOpened] = createSignal(false);
  const [revertVersion, setRevertVersion] = createSignal<VersionSummary | null>(null);
  const [historyRefreshing, startHistoryRefresh] = useTransition();
  const entryID = () => params.slug || "";
  const opened = createMemo(() => props.opened ?? layout.rightSidePanelWidth > 0);
  const activeVersionID = () =>
    typeof searchParams.version === "string" ? searchParams.version : "";
  const canManage = () => {
    const entry = content.entries.get({ entryID: entryID() });

    return content.canEntry(entry?.collectionID || null, "version:create");
  };
  const historyInput = () => ({ entryID: entryID(), limit: 50 });
  const versionHistory = createAsync(
    async () => {
      const currentEntryID = entryID();

      if (!opened() || !currentEntryID) return null;

      return {
        entryID: currentEntryID,
        response: await versionHistoryQuery({ entryID: currentEntryID, limit: 50 })
      };
    },
    { deferStream: true, initialValue: null }
  );
  const historyResponse = () => {
    const latest = versionHistory.latest;

    return latest?.entryID === entryID() ? latest.response : undefined;
  };
  const historyResult = () => historyResponse()?.result;
  const options = () => {
    if (!canManage()) return [];

    return [
      {
        label: "Create version",
        icon: "i-lucide:plus",
        onClick: () => setCreateDialogOpened(true)
      }
    ];
  };
  const storedVersions = createMemo(() => {
    return [...(historyResult()?.data ?? []), ...additionalPages().flatMap((page) => page.data)];
  });
  const nextCursor = () => {
    const pages = additionalPages();

    return pages.at(-1)?.pagination.nextCursor ?? historyResult()?.pagination.nextCursor ?? null;
  };
  const clearPreview = () => {
    setSearchParams({
      version: undefined,
      compare: undefined,
      compareView: undefined
    });
  };
  const openVersion = (version: string, compare = false) => {
    setSearchParams({
      version,
      compare: compare ? "current" : undefined,
      compareView: undefined
    });
  };
  const refreshHistory = (onRevalidated = () => {}) => {
    setAdditionalPages([]);
    void startHistoryRefresh(() => {
      void (async () => {
        await revalidate(versionHistoryQuery.keyFor(historyInput()));
        onRevalidated();
      })();
    });
  };
  const createVersionMutation = createMutation(() => ({
    mutationFn: (name: string) => {
      return client.versions.create({ entryID: entryID(), name: name || undefined });
    },
    onSuccess: () => {
      setCreateDialogOpened(false);
      refreshHistory();
      notify({ type: "success", text: "Version created" });
    },
    onError: (error) => {
      console.error(error);
      notify({ type: "error", text: "Failed to create version" });
    }
  }));
  const renameVersionMutation = createMutation(() => ({
    mutationFn: (input: { id: string; name: string | null }) => client.versions.update(input),
    onSuccess: (_data, input) => {
      refreshHistory(() => renameVersionMutation.reset());
      void revalidate(versionDetailsQuery.keyFor({ id: input.id }));
      notify({ type: "success", text: "Version renamed" });
    },
    onError: (error) => {
      renameVersionMutation.reset();
      console.error(error);
      notify({ type: "error", text: "Failed to rename version" });
    }
  }));
  const revertVersionMutation = createMutation(() => ({
    mutationFn: (id: string) => client.versions.revert({ id }),
    onSuccess: () => {
      setRevertVersion(null);
      clearPreview();
      refreshHistory();
      notify({ type: "success", text: "Current document reverted" });
    },
    onError: (error) => {
      console.error(error);
      notify({ type: "error", text: "Failed to revert current document" });
    }
  }));
  const versions = createMemo(() => {
    const variables = renameVersionMutation.variables;

    if ((renameVersionMutation.isPending || historyRefreshing()) && variables) {
      return storedVersions().map((version) => {
        if (version.id === variables.id) return { ...version, name: variables.name };

        return version;
      });
    }

    return storedVersions();
  });
  const publishing = useVersionPublishing({ entryID, opened });
  const versionsByID = createMemo(() => {
    return new Map(versions().map((version) => [version.id, version]));
  });
  const tree = createMemo<TreeMap>(() => ({
    [TREE_ROOT_ID]: {
      items: versions().map((version) => version.id),
      levels: []
    }
  }));
  const loadMore = async () => {
    const cursor = nextCursor();

    if (!cursor || loadingMore()) return;

    setLoadingMore(true);

    try {
      const response = await versionHistoryQuery({ ...historyInput(), cursor });
      const page = response.result;

      if (page) setAdditionalPages((pages) => [...pages, page]);
    } finally {
      setLoadingMore(false);
    }
  };

  createEffect(
    on(entryID, () => {
      setAdditionalPages([]);
      setRevertVersion(null);
    })
  );

  createEffect(() => {
    const currentEntryID = entryID();

    if (!opened() || !currentEntryID) return;

    const unsubscribe = subscribeToUpdates((event) => {
      const versionEvent =
        event.action === "version:create" ||
        event.action === "version:update" ||
        event.action === "version:delete";

      if (!versionEvent) return;
      if (event.action !== "version:delete" && event.data.entryID !== currentEntryID) return;

      if (
        event.action === "version:delete" &&
        activeVersionID() &&
        event.data.ids.includes(activeVersionID())
      ) {
        clearPreview();
      }

      refreshHistory();
    });

    onCleanup(unsubscribe);
  });

  return (
    <>
      <CreateVersionDialog
        opened={createDialogOpened()}
        loading={createVersionMutation.isPending}
        onClose={() => setCreateDialogOpened(false)}
        onConfirm={(name) => createVersionMutation.mutate(name)}
      />
      <RevertVersionDialog
        version={revertVersion()}
        loading={revertVersionMutation.isPending}
        onClose={() => {
          if (!revertVersionMutation.isPending) setRevertVersion(null);
        }}
        onConfirm={() => {
          const version = revertVersion();

          if (version) revertVersionMutation.mutate(version.id);
        }}
      />
      <DropdownArea>
        <div class="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-1 scrollbar-contrast">
          <div class="group/version-header sticky top-0 z-20 -mx-1 flex h-9 shrink-0 items-center gap-2 bg-white px-1 md:bg-gray-100">
            <h2 class="flex-1 text-2xl font-semibold">Versions</h2>
            <Show when={options().length > 0}>
              <DropdownMenu
                title="Versions"
                cardProps={{ class: "w-48" }}
                items={options()}
                mobileSheetDragFromContent={false}
                portal={false}
                trigger={() => (
                  <div class="opacity-20 media-mouse:opacity-0 media-mouse:group-hover/version-header:opacity-100">
                    <IconButton
                      icon="i-lucide:ellipsis-vertical"
                      size="small"
                      text="soft"
                      variant="text"
                    />
                  </div>
                )}
              />
            </Show>
          </div>
          <Suspense fallback={<VersionHistorySkeleton />}>
            <Show
              when={historyResponse() && !historyResponse()?.error}
              fallback={
                <Show when={historyResponse() !== undefined} fallback={<VersionHistorySkeleton />}>
                  <div class="flex flex-1 flex-col">
                    <div>
                      <Button
                        onClick={() => {
                          refreshHistory();
                        }}
                        class="flex justify-start items-center w-full group/button gap-1 pl-0.5 py-0.5"
                        variant="text"
                      >
                        <div class="flex h-6 w-6 items-center justify-center">
                          <div class="i-lucide:refresh-cw h-4.5 w-4.5 text-gray-400" />
                        </div>
                        <span class="text-left flex-1 line-clamp-1">Try again</span>
                      </Button>
                    </div>
                    <p class="mt-1 mx-1 text-left text-xs text-gray-400">
                      Versions could not be loaded. Check your connection and try again.
                    </p>
                  </div>
                </Show>
              }
            >
              <Show
                when={versions().length > 0}
                fallback={
                  <div class="flex flex-1 flex-col">
                    <div>
                      <For each={options()}>
                        {(option) => (
                          <Button
                            onClick={option.onClick}
                            class="flex justify-start items-center w-full group/button gap-1 pl-0.5 py-0.5"
                            variant="text"
                          >
                            <div class="flex h-6 w-6 items-center justify-center">
                              <div class={clsx(option.icon, "h-5 w-5 text-gray-400")} />
                            </div>
                            <span class="text-left flex-1 line-clamp-1">{option.label}</span>
                          </Button>
                        )}
                      </For>
                    </div>
                    <p class="mt-1 mx-1 text-left text-xs text-gray-400">
                      New versions will automatically be created as you make changes
                    </p>
                  </div>
                }
              >
                <Tree
                  tree={tree}
                  itemHeight={VERSION_ITEM_HEIGHT}
                  renderItem={(versionID) => {
                    const version = versionsByID().get(versionID);

                    return version ? (
                      <VersionHistoryItem
                        version={version}
                        active={activeVersionID() === version.id}
                        assignedChannels={publishing.assignedChannels(version.id)}
                        canManage={canManage()}
                        canManagePublishing={publishing.canManage()}
                        onAssign={(channel) => {
                          publishing.assign(version, channel);
                        }}
                        onCompare={() => {
                          void revalidate(entryDraftQuery.keyFor({ id: entryID() }));
                          openVersion(version.id, true);
                        }}
                        onOpen={() => openVersion(version.id)}
                        onRename={(name) => {
                          renameVersionMutation.mutate({
                            id: version.id,
                            name: name.trim() || null
                          });
                        }}
                        onRevert={() => setRevertVersion(version)}
                        onUnpublish={(channel) => {
                          publishing.unpublish(version, channel);
                        }}
                      />
                    ) : null;
                  }}
                />
                <Show when={nextCursor()}>
                  <Button
                    class="mt-1 w-full"
                    size="small"
                    text="softer"
                    variant="text"
                    loading={loadingMore()}
                    onClick={loadMore}
                  >
                    Load more
                  </Button>
                </Show>
              </Show>
            </Show>
          </Suspense>
        </div>
      </DropdownArea>
    </>
  );
};

export { VersionHistoryPanel };
