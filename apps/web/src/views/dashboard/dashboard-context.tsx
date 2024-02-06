import {
  Accessor,
  ParentComponent,
  Setter,
  createContext,
  createSignal,
  useContext
} from "solid-js";

type DashboardContextType = {
  activeDraggableContentGroupId: Accessor<string | null>;
  activeDraggableContentPieceId: Accessor<string | null>;
  setActiveDraggableContentGroupId: Setter<string | null>;
  setActiveDraggableContentPieceId: Setter<string | null>;
};

const DashboardContext = createContext<DashboardContextType>();
const DashboardDataProvider: ParentComponent = (props) => {
  const [activeDraggableContentGroupId, setActiveDraggableContentGroupId] = createSignal<
    string | null
  >(null);
  const [activeDraggableContentPieceId, setActiveDraggableContentPieceId] = createSignal<
    string | null
  >(null);

  return (
    <DashboardContext.Provider
      value={{
        activeDraggableContentGroupId,
        activeDraggableContentPieceId,
        setActiveDraggableContentGroupId,
        setActiveDraggableContentPieceId
      }}
    >
      {props.children}
    </DashboardContext.Provider>
  );
};
const useDashboardData = (): DashboardContextType => {
  return useContext(DashboardContext)!;
};

export { DashboardDataProvider, useDashboardData };
