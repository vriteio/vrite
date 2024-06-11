import {
  Accessor,
  ParentComponent,
  Setter,
  createContext,
  createSignal,
  useContext
} from "solid-js";

interface SnippetsMenuContextData {
  renaming: Accessor<string>;
  loading: Accessor<string>;
  highlight: Accessor<string | null>;
  setRenaming: Setter<string>;
  setLoading: Setter<string>;
  setHighlight: Setter<string | null>;
}

const SnippetsMenuDataContext = createContext<SnippetsMenuContextData>();
const SnippetsMenuDataProvider: ParentComponent = (props) => {
  const [renaming, setRenaming] = createSignal("");
  const [loading, setLoading] = createSignal("");
  const [highlight, setHighlight] = createSignal<string | null>(null);

  return (
    <SnippetsMenuDataContext.Provider
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
    </SnippetsMenuDataContext.Provider>
  );
};
const useSnippetsMenuData = (): SnippetsMenuContextData => {
  return useContext(SnippetsMenuDataContext)!;
};

export { SnippetsMenuDataProvider, useSnippetsMenuData };
