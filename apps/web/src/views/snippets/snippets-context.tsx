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
  setRenaming: Setter<string>;
  setLoading: Setter<string>;
}

const SnippetsMenuDataContext = createContext<SnippetsMenuContextData>();
const SnippetsMenuDataProvider: ParentComponent = (props) => {
  const [renaming, setRenaming] = createSignal("");
  const [loading, setLoading] = createSignal("");

  return (
    <SnippetsMenuDataContext.Provider
      value={{
        renaming,
        loading,
        setRenaming,
        setLoading
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
