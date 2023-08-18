import { DashboardKanbanView } from "./views/kanban";
import { DashboardListView } from "./views/list";
import { Component, Match, Switch, createEffect, on, onCleanup } from "solid-js";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { useNavigate } from "@solidjs/router";
import { App, useAuthenticatedUserData, useLocalStorage, useCache, useSharedState } from "#context";
import { getSelectionColor } from "#lib/utils";
import { useContentGroups } from "#lib/composables";

const DashboardView: Component = () => {
  const createSharedSignal = useSharedState();
  const cache = useCache();
  const navigate = useNavigate();
  const { workspace, profile } = useAuthenticatedUserData();
  const { storage, setStorage } = useLocalStorage();
  const ancestor = (): App.ContentGroup | null => {
    return storage().dashboardViewAncestor || null;
  };
  const { contentGroups, setContentGroups, refetch, loading } = cache("contentGroups", () => {
    return useContentGroups();
  });
  const ydoc = new Y.Doc();
  const handleReload = async (): Promise<void> => {
    await fetch("/session/refresh", { method: "POST" });
    window.location.reload();
  };
  const [provider, setProvider] = createSharedSignal(
    "provider",
    new HocuspocusProvider({
      token: "vrite",
      url: `ws${window.location.protocol.includes("https") ? "s" : ""}://${
        import.meta.env.PUBLIC_COLLAB_HOST
      }`,
      onDisconnect: handleReload,
      onAuthenticationFailed: handleReload,
      name: `workspace:${workspace()?.id || ""}`,
      document: ydoc
    })
  );
  const setAncestor = (ancestor: App.ContentGroup | null): void => {
    setStorage((storage) => ({
      ...storage,
      dashboardViewAncestor: ancestor || undefined
    }));
  };

  provider()?.awareness.setLocalStateField("user", {
    name: profile()?.username || "",
    avatar: profile()?.avatar || "",
    id: profile()?.id || "",
    selectionColor: getSelectionColor()
  });
  onCleanup(() => {
    provider()?.destroy();
    setProvider(undefined);
  });
  setStorage((storage) => ({ ...storage, toolbarView: "default" }));
  createEffect(
    on(storage, (storage, previousContentPieceId) => {
      if (storage.contentPieceId !== previousContentPieceId) {
        provider()?.awareness.setLocalStateField("contentPieceId", storage.contentPieceId);
      }

      return storage.contentPieceId;
    })
  );
  createEffect(
    on(ancestor, (ancestor, previousAncestor) => {
      if (ancestor?.id !== previousAncestor?.id) {
        refetch(ancestor?.id);
      }
    })
  );

  return (
    <div class="relative flex-1 overflow-hidden flex flex-row h-full">
      <Switch>
        <Match when={storage().dashboardView === "list"}>
          <DashboardListView
            ancestor={ancestor()}
            contentGroups={contentGroups()}
            contentGroupsLoading={loading()}
            setAncestor={setAncestor}
            setContentGroups={setContentGroups}
          />
        </Match>
        <Match when={storage().dashboardView === "kanban" || !storage().dashboardView}>
          <DashboardKanbanView
            ancestor={ancestor()}
            contentGroups={contentGroups()}
            contentGroupsLoading={loading()}
            setAncestor={setAncestor}
            setContentGroups={setContentGroups}
          />
        </Match>
      </Switch>
    </div>
  );
};

export { DashboardView };
