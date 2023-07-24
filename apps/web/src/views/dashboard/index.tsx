import { DashboardKanbanView } from "./views/kanban";
import { DashboardListView } from "./views/list";
import { Component, Match, Switch, createEffect, on, onCleanup } from "solid-js";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { App, useAuthenticatedUserData, useLocalStorage, useCache, useSharedState } from "#context";
import { getSelectionColor } from "#lib/utils";
import { useContentGroups } from "#lib/composables";

declare module "#context" {
  interface SharedState {
    ancestor: App.ContentGroup | null;
    dashboardView: "kanban" | "list";
  }
}

const DashboardView: Component = () => {
  const createSharedSignal = useSharedState();
  const cache = useCache();
  const { contentGroups, setContentGroups, refetch } = cache("contentGroups", () => {
    return useContentGroups();
  });
  const { workspace, profile } = useAuthenticatedUserData();
  const { storage, setStorage } = useLocalStorage();
  const ydoc = new Y.Doc();
  const [ancestor, setAncestor] = createSharedSignal("ancestor");
  const [view] = createSharedSignal("dashboardView", "kanban");
  const [provider, setProvider] = createSharedSignal(
    "provider",
    new HocuspocusProvider({
      token: "vrite",
      url: `ws${window.location.protocol.includes("https") ? "s" : ""}://${
        import.meta.env.PUBLIC_COLLAB_HOST
      }`,
      name: `workspace:${workspace()?.id || ""}`,
      document: ydoc
    })
  );

  provider()?.awareness.setLocalStateField("user", {
    name: profile()?.username || "",
    avatar: profile()?.avatar || "",
    id: profile()?.id || "",
    selectionColor: getSelectionColor()
  });
  onCleanup(() => {
    provider()?.destroy();
    setProvider(undefined);
    setAncestor(undefined);
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
    on(ancestor, (ancestor) => {
      refetch(ancestor?.id);
    })
  );

  return (
    <div class="relative flex-1 overflow-hidden flex flex-row h-full pt-5 pb-2.5">
      <Switch>
        <Match when={view() === "kanban"}>
          <DashboardKanbanView
            ancestor={ancestor()}
            contentGroups={contentGroups()}
            setAncestor={setAncestor}
            setContentGroups={setContentGroups}
          />
        </Match>
        <Match when={view() === "list"}>
          <DashboardListView
            ancestor={ancestor()}
            contentGroups={contentGroups()}
            setAncestor={setAncestor}
            setContentGroups={setContentGroups}
          />
        </Match>
      </Switch>
    </div>
  );
};

export { DashboardView };
