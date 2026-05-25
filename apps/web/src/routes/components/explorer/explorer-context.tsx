import {
  Accessor,
  createContext,
  createSignal,
  ParentComponent,
  Setter,
  useContext
} from "solid-js";
import { createStore } from "solid-js/store";

const ExplorerContext = createContext<
  [
    {
      selection: Accessor<string[]>;
      boundingBoxes: Record<string, DOMRect | undefined>;
      isSelected(id: string): boolean;
      isRenaming(id: string): boolean;
    },
    {
      setSelection: Setter<string[]>;
      setRenaming: Setter<string | null>;
      registerBoundingBox(id: string, boundingBox: DOMRect): () => void;
    }
  ]
>();

const ExplorerProvider: ParentComponent = (props) => {
  const [selection, setSelection] = createSignal<string[]>([]);
  const [renaming, setRenaming] = createSignal<string | null>(null);
  const [boundingBoxes, setBoundingBoxes] = createStore<Record<string, DOMRect | undefined>>();
  const isRenaming = (id: string) => renaming() === id;
  const registerBoundingBox = (id: string, boundingBox: DOMRect) => {
    setBoundingBoxes(id, boundingBox);

    return () => setBoundingBoxes(id, undefined);
  };
  const isSelected = (id: string) => {
    return selection().includes(id);
  };

  return (
    <ExplorerContext.Provider
      value={[
        {
          selection,
          boundingBoxes,
          isSelected,
          isRenaming
        },
        { setSelection, setRenaming, registerBoundingBox }
      ]}
    >
      {props.children}
    </ExplorerContext.Provider>
  );
};
const useExplorer = () => {
  return useContext(ExplorerContext)!;
};

export { ExplorerProvider, useExplorer };
