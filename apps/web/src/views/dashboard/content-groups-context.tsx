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
  activeDraggablePiece: Accessor<App.ContentPieceWithAdditionalData | null>;
  setActiveDraggablePiece: Setter<App.ContentPieceWithAdditionalData | null>;
}

const ContentGroupsContext = createContext<ContentGroupsContextData>();
const ContentGroupsContextProvider: ParentComponent<ContentGroupsContextProviderProps> = (
  props
) => {
  const [activeDraggablePiece, setActiveDraggablePiece] =
    createSignal<App.ContentPieceWithAdditionalData | null>(null);

  return (
    <ContentGroupsContext.Provider
      value={{
        activeDraggablePiece,
        setActiveDraggablePiece,
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
