import {
  Accessor,
  ParentComponent,
  Setter,
  createContext,
  createEffect,
  createSignal,
  useContext
} from "solid-js";
import { App } from "#context";

interface StorageData {
  sourceControlConfiguredProvider: string;
  sidePanelView: string;
  sidePanelWidth: number;
  toolbarView: string;
  dashboardView: string;
  dashboardViewAncestor: App.ContentGroup;
  contentPieceId: string;
  settingsSection: string;
  zenMode: boolean;
  html: string;
  explorerOpenedLevels: string[];
}
interface LocalStorageContextData {
  storage: Accessor<Partial<StorageData>>;
  setStorage: Setter<Partial<StorageData>>;
}

const LocalStorageContext = createContext<LocalStorageContextData>();
const LocalStorageProvider: ParentComponent = (props) => {
  const [storage, setStorage] = createSignal<Partial<StorageData>>({});

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
    <LocalStorageContext.Provider
      value={{
        storage,
        setStorage
      }}
    >
      {props.children}
    </LocalStorageContext.Provider>
  );
};
const useLocalStorage = (): LocalStorageContextData => {
  return useContext(LocalStorageContext)!;
};

export { LocalStorageProvider, useLocalStorage };
