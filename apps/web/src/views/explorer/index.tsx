import { DashboardListView } from "./list";
import { Component } from "solid-js";
import { App, useLocalStorage } from "#context";

const ExplorerView: Component = () => {
  const { storage, setStorage } = useLocalStorage();
  const ancestor = (): App.ContentGroup | null => {
    return storage().dashboardViewAncestor || null;
  };
  const setAncestor = (ancestor: App.ContentGroup | null): void => {
    setStorage((storage) => ({
      ...storage,
      dashboardViewAncestor: ancestor || undefined
    }));
  };

  return (
    <div class="relative flex-1 overflow-hidden flex flex-row h-full">
      <DashboardListView ancestor={ancestor()} setAncestor={setAncestor} />
    </div>
  );
};

export { ExplorerView };
