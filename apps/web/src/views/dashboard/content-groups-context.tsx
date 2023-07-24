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
  ancestor: Accessor<App.ContentGroup | null | undefined>;
  setAncestor(ancestor: App.ContentGroup | null | undefined): void;
}
interface ContentGroupsContextData extends ContentGroupsContextProviderProps {
  activeDraggable: Accessor<App.ExtendedContentPieceWithAdditionalData<"locked"> | null>;
  setActiveDraggable: Setter<App.ExtendedContentPieceWithAdditionalData<"locked"> | null>;
  draggingGroup: Accessor<App.ContentGroup | null>;
  setDraggingGroup: Setter<App.ContentGroup | null>;
}

const ContentGroupsContext = createContext<ContentGroupsContextData>();
const ContentGroupsContextProvider: ParentComponent<ContentGroupsContextProviderProps> = (
  props
) => {
  const [activeDraggable, setActiveDraggable] =
    createSignal<App.ExtendedContentPieceWithAdditionalData<"locked"> | null>(null);
  const [draggingGroup, setDraggingGroup] = createSignal<App.ContentGroup | null>(null);

  return (
    <ContentGroupsContext.Provider
      value={{
        activeDraggable,
        setActiveDraggable,
        ancestor: props.ancestor,
        setAncestor: props.setAncestor,
        draggingGroup,
        setDraggingGroup
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
