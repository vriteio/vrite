import {
  Accessor,
  createContext,
  createSignal,
  ParentComponent,
  Setter,
  useContext
} from "solid-js";
import { App } from "#context";

interface ColumnsContextData {
  activeDraggable: Accessor<App.ExtendedContentPieceWithAdditionalData<"slug" | "locked"> | null>;
  setActiveDraggable: Setter<App.ExtendedContentPieceWithAdditionalData<"slug" | "locked"> | null>;
}

const ColumnsContext = createContext<ColumnsContextData>();
const ColumnsContextProvider: ParentComponent = (props) => {
  const [activeDraggable, setActiveDraggable] =
    createSignal<App.ExtendedContentPieceWithAdditionalData<"slug" | "locked"> | null>(null);

  return (
    <ColumnsContext.Provider value={{ activeDraggable, setActiveDraggable }}>
      {props.children}
    </ColumnsContext.Provider>
  );
};
const useColumnsContext = (): ColumnsContextData => {
  return useContext(ColumnsContext) as ColumnsContextData;
};

export { ColumnsContextProvider, useColumnsContext };
