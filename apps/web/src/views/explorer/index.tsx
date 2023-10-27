import { DashboardListView } from "./list";
import { Component, createEffect, on } from "solid-js";
import { App, useLocalStorage, useCache } from "#context";
import { useContentGroups } from "#lib/composables";

const ExplorerView: Component = () => {
  const cache = useCache();
  const { storage, setStorage } = useLocalStorage();
  const ancestor = (): App.ContentGroup | null => {
    return storage().dashboardViewAncestor || null;
  };
  const { contentGroups, setContentGroups, refetch, loading } = cache("contentGroups", () => {
    return useContentGroups(ancestor()?.id);
  });
  const setAncestor = (ancestor: App.ContentGroup | null): void => {
    setStorage((storage) => ({
      ...storage,
      dashboardViewAncestor: ancestor || undefined
    }));
  };

  setStorage((storage) => ({ ...storage, toolbarView: "default" }));
  createEffect(
    on(ancestor, (ancestor, previousAncestor) => {
      if (ancestor?.id !== previousAncestor?.id) {
        refetch(ancestor?.id);
      }
    })
  );

  return (
    <div class="relative flex-1 overflow-hidden flex flex-row h-full">
      <DashboardListView
        ancestor={ancestor()}
        contentGroups={contentGroups()}
        contentGroupsLoading={loading()}
        setAncestor={setAncestor}
        setContentGroups={setContentGroups}
      />
    </div>
  );
};

export { ExplorerView };
