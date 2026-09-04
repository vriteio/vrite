import { createAsync, revalidate, useParams, useSearchParams } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  useTransition
} from "solid-js";
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
import { VersionHistoryList } from "./version-history/list";
import { useVersionPublishing } from "./use-version-publishing";

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
  const migrationActive = () => {
    const entry = content.entries.get({ entryID: entryID() });

    return content.hasActiveSchemaMigration(entry?.collectionID || null);
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

          if (version && !migrationActive()) revertVersionMutation.mutate(version.id);
        }}
      />
      <VersionHistoryList
        activeVersionID={activeVersionID()}
        assignedChannels={(version) => publishing.assignedChannels(version.id)}
        canManage={canManage()}
        canRevert={() => !migrationActive()}
        canManagePublishing={publishing.canManage()}
        emptyMessage="New versions will automatically be created as you make changes"
        failed={Boolean(historyResponse()?.error)}
        loading={historyResponse() === undefined}
        loadingMore={loadingMore()}
        nextCursor={nextCursor()}
        options={options()}
        versions={versions()}
        onAssign={(version, channel) => {
          const entryVersion = versions().find(({ id }) => id === version.id);

          if (entryVersion) publishing.assign(entryVersion, channel);
        }}
        onCompare={(version) => {
          void revalidate(entryDraftQuery.keyFor({ id: entryID() }));
          openVersion(version.id, true);
        }}
        onLoadMore={loadMore}
        onOpen={(version) => openVersion(version.id)}
        onRefresh={refreshHistory}
        onRename={(version, name) => {
          renameVersionMutation.mutate({ id: version.id, name: name.trim() || null });
        }}
        onRevert={(version) => {
          if (migrationActive()) return;

          const entryVersion = versions().find(({ id }) => id === version.id);

          if (entryVersion) setRevertVersion(entryVersion);
        }}
        onUnpublish={(version, channel) => {
          const entryVersion = versions().find(({ id }) => id === version.id);

          if (entryVersion) publishing.unpublish(entryVersion, channel);
        }}
      />
    </>
  );
};

export { VersionHistoryPanel };
