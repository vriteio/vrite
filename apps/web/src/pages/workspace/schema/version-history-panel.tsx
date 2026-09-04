import { createAsync, revalidate, useParams, useSearchParams } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { formatDistanceToNow } from "date-fns";
import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  useTransition
} from "solid-js";
import { ActionConfirmationDialog } from "#web/components/action-confirmation-dialog";
import { useLayout } from "#web/context/layout";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { client } from "#web/lib/api";
import {
  schemaDraftQuery,
  schemaVersionDetailsQuery,
  schemaVersionHistoryQuery,
  type SchemaVersionListPage,
  type SchemaVersionSummary
} from "#web/lib/data";
import { useSchemaMigration } from "../use-schema-migration";
import { VersionHistoryList } from "../version-history/list";

interface SchemaVersionHistoryPanelProps {
  opened?: boolean;
}

const SchemaVersionHistoryPanel: Component<SchemaVersionHistoryPanelProps> = (props) => {
  const params = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { layout } = useLayout();
  const { content, subscribeToUpdates } = useWorkspace();
  const notify = useNotify();
  const [additionalPages, setAdditionalPages] = createSignal<SchemaVersionListPage[]>([]);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [revertVersion, setRevertVersion] = createSignal<SchemaVersionSummary | null>(null);
  const [historyRefreshing, startHistoryRefresh] = useTransition();
  const schemaID = () => params.slug || "";
  const schema = () => content.schemasCollection().findOne({ id: schemaID() });
  const collectionID = () => schema()?.collectionID || "";
  const opened = createMemo(() => props.opened ?? layout.rightSidePanelWidth > 0);
  const activeVersionID = () => {
    return typeof searchParams.version === "string" ? searchParams.version : "";
  };
  const canManage = () => {
    const currentCollectionID = collectionID();

    return Boolean(
      currentCollectionID &&
      content.canCollection(currentCollectionID, "collection:update") &&
      !content.hasActiveSchemaMigration(currentCollectionID, true)
    );
  };
  const revertAffected = () => {
    const version = revertVersion();

    if (!version) return [];

    return [
      {
        detail: formatDistanceToNow(new Date(version.createdAt), { addSuffix: true }),
        id: version.id,
        icon: "i-lucide:history",
        label: version.name || `Version ${version.version}`
      }
    ];
  };
  const historyInput = () => ({ schemaID: schemaID(), limit: 50 });
  const versionHistory = createAsync(
    async () => {
      const currentSchemaID = schemaID();

      if (!opened() || !currentSchemaID) return null;

      return {
        schemaID: currentSchemaID,
        response: await schemaVersionHistoryQuery({ schemaID: currentSchemaID, limit: 50 })
      };
    },
    { deferStream: true, initialValue: null }
  );
  const historyResponse = () => {
    const latest = versionHistory.latest;

    return latest?.schemaID === schemaID() ? latest.response : undefined;
  };
  const historyResult = () => historyResponse()?.result;
  const clearPreview = () => {
    setSearchParams({ version: undefined, compare: undefined, compareView: undefined });
  };
  const refreshHistory = (onRevalidated = () => {}) => {
    setAdditionalPages([]);
    void startHistoryRefresh(() => {
      void (async () => {
        await revalidate(schemaVersionHistoryQuery.keyFor(historyInput()));
        onRevalidated();
      })();
    });
  };
  const refreshSchemaDraft = () => {
    const currentCollectionID = collectionID();

    if (currentCollectionID) {
      void revalidate(schemaDraftQuery.keyFor({ collectionID: currentCollectionID }));
    }
  };
  const schemaMigration = useSchemaMigration({
    onCompleted: () => {
      refreshHistory();
      refreshSchemaDraft();
    }
  });
  const renameVersionMutation = createMutation(() => ({
    mutationFn: (input: { id: string; name: string | null }) => {
      return client.schemaVersions.update(input);
    },
    onSuccess: (_data, input) => {
      refreshHistory(() => renameVersionMutation.reset());
      void revalidate(schemaVersionDetailsQuery.keyFor({ id: input.id }));
      notify({ type: "success", text: "Version renamed" });
    },
    onError: (error) => {
      renameVersionMutation.reset();
      console.error(error);
      notify({ type: "error", text: "Failed to rename version" });
    }
  }));
  const revertVersionMutation = createMutation(() => ({
    mutationFn: (id: string) => {
      return client.schemaVersions.revert({ id, confirmedDataLoss: true });
    },
    onSuccess: (result) => {
      setRevertVersion(null);
      clearPreview();
      refreshHistory();
      refreshSchemaDraft();

      if (result.migrationID) {
        schemaMigration.start({
          migrationID: result.migrationID,
          totalEntries: result.totalEntries
        });
        return;
      }

      notify({ type: "success", text: "Schema reverted" });
    },
    onError: (error) => {
      console.error(error);
      notify({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to revert schema"
      });
    }
  }));
  const storedVersions = createMemo(() => {
    return [...(historyResult()?.data ?? []), ...additionalPages().flatMap((page) => page.data)];
  });
  const nextCursor = () => {
    const pages = additionalPages();

    return pages.at(-1)?.pagination.nextCursor ?? historyResult()?.pagination.nextCursor ?? null;
  };
  const versions = createMemo(() => {
    const variables = renameVersionMutation.variables;

    if ((renameVersionMutation.isPending || historyRefreshing()) && variables) {
      return storedVersions().map((version) => {
        return version.id === variables.id ? { ...version, name: variables.name } : version;
      });
    }

    return storedVersions();
  });
  const openVersion = (versionID: string, compare = false) => {
    setSearchParams({
      version: versionID,
      compare: compare ? "current" : undefined,
      compareView: undefined
    });
  };
  const loadMore = async () => {
    const cursor = nextCursor();

    if (!cursor || loadingMore()) return;

    setLoadingMore(true);

    try {
      const response = await schemaVersionHistoryQuery({ ...historyInput(), cursor });
      const page = response.result;

      if (page) setAdditionalPages((pages) => [...pages, page]);
    } finally {
      setLoadingMore(false);
    }
  };

  createEffect(
    on(schemaID, () => {
      setAdditionalPages([]);
      setRevertVersion(null);
    })
  );
  createEffect(() => {
    const currentSchemaID = schemaID();

    if (!opened() || !currentSchemaID) return;

    const unsubscribe = subscribeToUpdates((event) => {
      const schemaVersionEvent =
        event.action === "schema-version:create" || event.action === "schema-version:update";

      if (!schemaVersionEvent || event.data.schemaID !== currentSchemaID) return;

      refreshHistory();
    });

    onCleanup(unsubscribe);
  });

  return (
    <>
      <ActionConfirmationDialog
        opened={Boolean(revertVersion())}
        title="Revert schema to this version?"
        description={
          <>
            The selected version will become the schema draft and will be applied to this collection
            and its affected subcollections.
          </>
        }
        affected={revertAffected()}
        warning="This migration can remove content. Removed content remains available through entry versions."
        action={{
          color: "primary",
          label: "Revert & apply",
          loading: revertVersionMutation.isPending,
          onClick: () => {
            const version = revertVersion();

            if (version && canManage()) revertVersionMutation.mutate(version.id);
          }
        }}
        onClose={() => {
          if (!revertVersionMutation.isPending) setRevertVersion(null);
        }}
      />
      <VersionHistoryList
        activeVersionID={activeVersionID()}
        canManage={canManage()}
        canRevert={(version) => canManage() && !version.active}
        emptyMessage="Versions are created when schema changes are applied."
        failed={Boolean(historyResponse()?.error)}
        fallbackLabel={(version) => `Version ${version.version}`}
        loading={historyResponse() === undefined}
        loadingMore={loadingMore()}
        nextCursor={nextCursor()}
        versions={versions()}
        onCompare={(version) => {
          refreshSchemaDraft();
          openVersion(version.id, true);
        }}
        onLoadMore={loadMore}
        onOpen={(version) => openVersion(version.id)}
        onRefresh={refreshHistory}
        onRename={(version, name) => {
          renameVersionMutation.mutate({ id: version.id, name: name.trim() || null });
        }}
        onRevert={(version) => {
          if (!canManage()) return;

          const schemaVersion = versions().find(({ id }) => id === version.id);

          if (schemaVersion) setRevertVersion(schemaVersion);
        }}
      />
    </>
  );
};

export { SchemaVersionHistoryPanel };
