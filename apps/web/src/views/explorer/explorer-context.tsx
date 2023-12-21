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
  setRenaming: Setter<string>;
  setLoading: Setter<string>;
  setHighlight: Setter<string>;
}

const ExplorerDataContext = createContext<ExplorerContextData>();
const ExplorerDataProvider: ParentComponent = (props) => {
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
        setHighlight
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
