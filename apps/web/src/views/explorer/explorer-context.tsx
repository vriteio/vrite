import {
  Accessor,
  ParentComponent,
  Setter,
  createContext,
  createSignal,
  useContext
} from "solid-js";
import { SetStoreFunction, createStore } from "solid-js/store";
import { App } from "#context";

interface Level {
  groups: string[];
  pieces: string[];
  moreToLoad: boolean;
}
interface ExplorerContextData {
  levels: Record<string, Level | undefined>;
  contentGroups: Record<string, App.ContentGroup | undefined>;
  contentPieces: Record<string, App.ExtendedContentPieceWithAdditionalData<"order"> | undefined>;
  renaming: Accessor<string>;
  loading: Accessor<string>;
  setLevels: SetStoreFunction<Record<string, Level | undefined>>;
  setContentGroups: SetStoreFunction<Record<string, App.ContentGroup | undefined>>;
  setContentPieces: SetStoreFunction<
    Record<string, App.ExtendedContentPieceWithAdditionalData<"order"> | undefined>
  >;
  setRenaming: Setter<string>;
  setLoading: Setter<string>;
}

const ExplorerDataContext = createContext<ExplorerContextData>();
const ExplorerDataProvider: ParentComponent = (props) => {
  const [levels, setLevels] = createStore<Record<string, Level | undefined>>({});
  const [contentGroups, setContentGroups] = createStore<
    Record<string, App.ContentGroup | undefined>
  >({});
  const [contentPieces, setContentPieces] = createStore<
    Record<string, App.ExtendedContentPieceWithAdditionalData<"order"> | undefined>
  >({});
  const [renaming, setRenaming] = createSignal("");
  const [loading, setLoading] = createSignal("");

  return (
    <ExplorerDataContext.Provider
      value={{
        levels,
        contentGroups,
        contentPieces,
        renaming,
        loading,
        setLevels,
        setContentGroups,
        setContentPieces,
        setRenaming,
        setLoading
      }}
    >
      {props.children}
    </ExplorerDataContext.Provider>
  );
};
const useExplorerData = (): ExplorerContextData => {
  return useContext(ExplorerDataContext)!;
};

export { ExplorerDataProvider, useExplorerData };
export type { Level };
