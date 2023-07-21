import {
  Accessor,
  createContext,
  createSignal,
  ParentComponent,
  Setter,
  useContext
} from "solid-js";
import { App } from "#context";

interface ContentGroupsContextProviderProps {
  ancestor: Accessor<App.ContentGroup | null>;
  setAncestor: Setter<App.ContentGroup | null>;
}
interface ContentGroupsContextData extends ContentGroupsContextProviderProps {
  activeDraggable: Accessor<App.ExtendedContentPieceWithAdditionalData<"locked"> | null>;
  setActiveDraggable: Setter<App.ExtendedContentPieceWithAdditionalData<"locked"> | null>;
}

const ContentGroupsContext = createContext<ContentGroupsContextData>();
const ContentGroupsContextProvider: ParentComponent<ContentGroupsContextProviderProps> = (
  props
) => {
  const [activeDraggable, setActiveDraggable] =
    createSignal<App.ExtendedContentPieceWithAdditionalData<"locked"> | null>(null);

  return (
    <ContentGroupsContext.Provider
      value={{
        activeDraggable,
        setActiveDraggable,
        ancestor: props.ancestor,
        setAncestor: props.setAncestor
      }}
    >
      {props.children}
    </ContentGroupsContext.Provider>
  );
};
const useContentGroupsContext = (): ContentGroupsContextData => {
  return useContext(ContentGroupsContext) as ContentGroupsContextData;
};

export { ContentGroupsContextProvider, useContentGroupsContext };
