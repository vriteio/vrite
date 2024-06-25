import {
  Accessor,
  ParentComponent,
  Setter,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  useContext
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { useParams } from "@solidjs/router";
import { App, useClient, useContentData } from "#context";

interface HistoryActions {
  updateVersion(update: Pick<App.Version, "id" | "label">): void;
}
interface HistoryDataContextData {
  versions: Record<string, App.VersionWithAdditionalData>;
  entryIds: Accessor<string[]>;
  loading: Accessor<boolean>;
  setLoading: Setter<boolean>;
  moreToLoad: Accessor<boolean>;
  historyActions: HistoryActions;
  loadMore(): Promise<void>;
  activeVersionId(): string;
  diffAgainst(): "latest" | "previous" | "";
}

const HistoryDataContext = createContext<HistoryDataContextData>();
const HistoryDataProvider: ParentComponent = (props) => {
  const client = useClient();
  const params = useParams();
  const { activeContentPieceId, activeVariantId } = useContentData();
  const [versions, setVersions] = createStore<Record<string, App.VersionWithAdditionalData>>({});
  const [entryIds, setEntryIds] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [moreToLoad, setMoreToLoad] = createSignal(true);
  const loadMore = async (): Promise<void> => {
    const lastId = entryIds().at(-1);

    if (loading() || !moreToLoad()) return;

    setLoading(true);

    const data = await client.versions.list.query({
      contentPieceId: activeContentPieceId()!,
      ...(activeVariantId() && { variantId: activeVariantId()! }),
      perPage: 100,
      lastId
    });

    setEntryIds((ids) => [...ids, ...data.map((entry) => entry.id)]);
    data.forEach((entry) => {
      setVersions(entry.id, entry);
    });
    setLoading(false);
    setMoreToLoad(data.length === 100);
  };
  const activeVersionId = createMemo(() => {
    return params.versionId || "";
  });
  const diffAgainst = createMemo(() => {
    if (!params.diffAgainst) return "";

    return params.diffAgainst === "latest" ? "latest" : "previous";
  });
  const historyActions: HistoryActions = {
    updateVersion: (update) => {
      if (versions[update.id]) {
        setVersions(update.id, { ...versions[update.id], label: update.label });
      }
    }
  };
  const versionsSubscription = client.versions.changes.subscribe(undefined, {
    onData({ action, data }) {
      if (action === "update") {
        historyActions.updateVersion(data);
      } else if (
        action === "create" &&
        data.contentPieceId === activeContentPieceId() &&
        data.variantId === activeVariantId()
      ) {
        setEntryIds((entries) => [data.id, ...entries]);
        setVersions(data.id, data);
      }
    }
  });

  createEffect(
    on(activeContentPieceId, (activeContentPieceId) => {
      setEntryIds([]);
      setMoreToLoad(true);
      setLoading(false);
      setVersions(reconcile({}));

      if (activeContentPieceId) {
        loadMore();
      }
    })
  );
  createEffect(
    on(activeVersionId, (activeVersionId) => {
      if (activeVersionId && !versions[activeVersionId]) {
        client.versions.get
          .query({ id: activeVersionId })
          .then((version) => {
            setVersions(version.id, version);
          })
          .catch(() => {});
      }
    })
  );
  onCleanup(() => {
    versionsSubscription.unsubscribe();
  });

  return (
    <HistoryDataContext.Provider
      value={{
        entryIds,
        versions,
        loading,
        setLoading,
        moreToLoad,
        loadMore,
        activeVersionId,
        diffAgainst,
        historyActions
      }}
    >
      {props.children}
    </HistoryDataContext.Provider>
  );
};
const useHistoryData = (): HistoryDataContextData => {
  return useContext(HistoryDataContext)!;
};

export { HistoryDataProvider, useHistoryData };
