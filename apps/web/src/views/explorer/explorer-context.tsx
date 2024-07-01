import { useLocation } from "@solidjs/router";
import {
  Accessor,
  ParentComponent,
  Setter,
  createContext,
  createMemo,
  createSignal,
  useContext
} from "solid-js";

interface ExplorerContextData {
  renaming: Accessor<string>;
  loading: Accessor<string>;
  highlight: Accessor<string | null>;
  reordering: Accessor<boolean>;
  activeDraggableContentGroupId: Accessor<string | null>;
  activeDraggableContentPieceId: Accessor<string | null>;
  setActiveDraggableContentGroupId: Setter<string | null>;
  setActiveDraggableContentPieceId: Setter<string | null>;
  setRenaming: Setter<string>;
  setLoading: Setter<string>;
  setHighlight: Setter<string | null>;
  setReordering: Setter<boolean>;
  pathnameData: Accessor<{
    activeContentPieceId?: string;
    view?: "editor" | "dashboard";
  }>;
}

const ExplorerDataContext = createContext<ExplorerContextData>();
const ExplorerDataProvider: ParentComponent = (props) => {
  const location = useLocation();
  const [activeDraggableContentGroupId, setActiveDraggableContentGroupId] = createSignal<
    string | null
  >(null);
  const [activeDraggableContentPieceId, setActiveDraggableContentPieceId] = createSignal<
    string | null
  >(null);
  const [renaming, setRenaming] = createSignal("");
  const [loading, setLoading] = createSignal("");
  const [reordering, setReordering] = createSignal(false);
  const [highlight, setHighlight] = createSignal<string | null>(null);
  const pathnameData = createMemo<{
    activeContentPieceId?: string;
    view?: "editor" | "dashboard";
  }>(() => {
    const pathRegex = /^\/(?:editor\/)?([a-f\d]{24})?$/i;
    const match = location.pathname.match(pathRegex);

    if (!match) return {};

    return {
      activeContentPieceId: match[1],
      view: match[0].includes("editor") ? "editor" : "dashboard"
    };
  });

  return (
    <ExplorerDataContext.Provider
      value={{
        renaming,
        loading,
        highlight,
        reordering,
        setRenaming,
        setLoading,
        setHighlight,
        setReordering,
        pathnameData,
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
