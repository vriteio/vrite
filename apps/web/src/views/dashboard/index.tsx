import { DashboardKanbanView } from "./kanban";
import { DashboardTableView } from "./table";
import { DashboardDataProvider } from "./dashboard-context";
import { Component, Match, Switch, createEffect, on, onCleanup } from "solid-js";
import { HocuspocusProvider, WebSocketStatus } from "@hocuspocus/provider";
import * as Y from "yjs";
import {
  useAuthenticatedUserData,
  useContentData,
  useLocalStorage,
  useSharedState
} from "#context";
import { getSelectionColor } from "#lib/utils";

const DashboardView: Component = () => {
  const { useSharedSignal } = useSharedState();
  const { workspace, profile, membership } = useAuthenticatedUserData();
  const { storage, setStorage } = useLocalStorage();
  const { activeContentPieceId } = useContentData();
  const [provider, setProvider] = useSharedSignal("provider");
  const ydoc = new Y.Doc();
  const handleReload = async (): Promise<void> => {
    await fetch("/session/refresh", { method: "POST" });
    provider()?.connect();
  };

  provider()?.awareness?.setLocalStateField("user", {
    name: profile()?.username || "",
    avatar: profile()?.avatar || "",
    id: profile()?.id || "",
    membershipId: membership()?.id || "",
    selectionColor: getSelectionColor()
  });
  onCleanup(() => {
    provider()?.destroy();
    setProvider(undefined);
  });
  setStorage((storage) => ({ ...storage, toolbarView: "default" }));
  createEffect(
    on(storage, (storage, previousContentPieceId) => {
      if (activeContentPieceId() !== previousContentPieceId) {
        provider()?.awareness?.setLocalStateField("contentPieceId", activeContentPieceId());
      }

      return activeContentPieceId();
    })
  );

  if (!provider()) {
    new HocuspocusProvider({
      token: "vrite",
      url: window.env.PUBLIC_COLLAB_URL.replace("http", "ws"),
      onDisconnect: handleReload,
      onAuthenticationFailed: handleReload,
      onClose: handleReload,
      onStatus({ status }) {
        if (status === WebSocketStatus.Disconnected) {
          handleReload();
        }
      },
      name: `workspace:${workspace()?.id || ""}`,
      document: ydoc
    });
  }

  return (
    <div class="relative flex-1 overflow-hidden flex flex-row h-full" id="table">
      <DashboardDataProvider>
        <Switch>
          <Match when={storage().dashboardView === "table"}>
            <DashboardTableView />
          </Match>
          <Match when={storage().dashboardView === "kanban" || !storage().dashboardView}>
            <DashboardKanbanView />
          </Match>
        </Switch>
      </DashboardDataProvider>
    </div>
  );
};

export { DashboardView };
