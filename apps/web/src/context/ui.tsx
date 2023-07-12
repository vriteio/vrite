import { SolidEditor } from "@vrite/tiptap-solid";
import {
  Accessor,
  ParentComponent,
  Setter,
  createContext,
  createEffect,
  createSignal,
  useContext
} from "solid-js";
import { SetStoreFunction, createStore } from "solid-js/store";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { App } from "#context";
import { breakpoints } from "#lib/utils";

interface StorageData {
  sidePanelView: string;
  sidePanelWidth: number;
  toolbarView: string;
  contentPieceId: string;
  settingsSection: string;
  zenMode: boolean;
  html: string;
}
interface ReferencesData {
  editedContentPiece?: App.ExtendedContentPieceWithAdditionalData<"locked">;
  provider?: HocuspocusProvider;
  editor?: SolidEditor;
}
interface UIContextData {
  storage: Accessor<Partial<StorageData>>;
  references: ReferencesData;
  setStorage: Setter<Partial<StorageData>>;
  setReferences: SetStoreFunction<ReferencesData>;
  breakpoints: {
    md(): boolean;
  };
}

const UIContext = createContext<UIContextData>();
const UIContextProvider: ParentComponent = (props) => {
  const [storage, setStorage] = createSignal<Partial<StorageData>>({});
  const [references, setReferences] = createStore<ReferencesData>({});

  try {
    const storedData = localStorage.getItem("ui");

    if (storedData && storedData !== "{}") {
      setStorage(JSON.parse(storedData));
    } else {
      setStorage({
        toolbarView: "default",
        sidePanelView: "default",
        sidePanelWidth: 375
      });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  createEffect(() => {
    const stringified = JSON.stringify(storage());

    if (stringified === "{}") {
      localStorage.removeItem("ui");

      return;
    }

    localStorage.setItem("ui", stringified);
  });

  return (
    <UIContext.Provider
      value={{
        storage,
        references,
        setStorage,
        setReferences,
        breakpoints
      }}
    >
      {props.children}
    </UIContext.Provider>
  );
};
const useUIContext = (): UIContextData => {
  return useContext(UIContext)!;
};

export { UIContextProvider, useUIContext };
