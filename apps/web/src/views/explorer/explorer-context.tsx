import {
  Accessor,
  ParentComponent,
  Setter,
  createContext,
  createSignal,
  useContext
} from "solid-js";

interface ExplorerContextData {
  renaming: Accessor<string>;
  loading: Accessor<string>;
  highlight: Accessor<string>;
  activeDraggableContentGroupId: Accessor<string | null>;
  activeDraggableContentPieceId: Accessor<string | null>;
  setActiveDraggableContentGroupId: Setter<string | null>;
  setActiveDraggableContentPieceId: Setter<string | null>;
  setRenaming: Setter<string>;
  setLoading: Setter<string>;
  setHighlight: Setter<string>;
}

const ExplorerDataContext = createContext<ExplorerContextData>();
const ExplorerDataProvider: ParentComponent = (props) => {
  const [activeDraggableContentGroupId, setActiveDraggableContentGroupId] = createSignal<
    string | null
  >(null);
  const [activeDraggableContentPieceId, setActiveDraggableContentPieceId] = createSignal<
    string | null
  >(null);
  const [renaming, setRenaming] = createSignal("");
  const [loading, setLoading] = createSignal("");
  const [highlight, setHighlight] = createSignal("");

  return (
    <ExplorerDataContext.Provider
      value={{
        renaming,
        loading,
        highlight,
        setRenaming,
        setLoading,
        setHighlight,
        activeDraggableContentGroupId,
        activeDraggableContentPieceId,
        setActiveDraggableContentGroupId,
        setActiveDraggableContentPieceId
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
