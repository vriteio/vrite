import {
  Accessor,
  ParentComponent,
  Setter,
  createContext,
  createEffect,
  createSignal,
  on,
  useContext
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { useContentData, useHistoryData } from "#context";

interface HistoryMenuContextData {
  labelling: Accessor<string>;
  setLabelling: Setter<string>;
  useExpanded(id: string): [() => boolean, (value: boolean) => void];
}

const HistoryMenuDataContext = createContext<HistoryMenuContextData>();
const HistoryMenuDataProvider: ParentComponent = (props) => {
  const { activeVersionId } = useHistoryData();
  const { activeContentPieceId } = useContentData();
  const [expanded, setExpanded] = createStore({} as Record<string, boolean>);
  const [labelling, setLabelling] = createSignal("");
  const useExpanded = (id: string): [() => boolean, (value: boolean) => void] => {
    return [() => expanded[id], (value: boolean) => setExpanded(id, value)];
  };

  createEffect(
    on(activeContentPieceId, () => {
      setLabelling("");
      setExpanded(reconcile({}));
    })
  );
  createEffect(() => {
    setExpanded(activeVersionId(), true);
  });

  return (
    <HistoryMenuDataContext.Provider
      value={{
        labelling,
        setLabelling,
        useExpanded
      }}
    >
      {props.children}
    </HistoryMenuDataContext.Provider>
  );
};
const useHistoryMenuData = (): HistoryMenuContextData => {
  return useContext(HistoryMenuDataContext)!;
};

export { HistoryMenuDataProvider, useHistoryMenuData };
