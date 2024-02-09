import {
  Accessor,
  ParentComponent,
  Setter,
  createContext,
  createEffect,
  createSignal,
  useContext
} from "solid-js";

interface StorageData {
  activeContentGroupId: string;
  activeVariantId: string;
  expandedContentLevels: string[];
  dashboardView: string;
  sidePanelView: string;
  rightPanelWidth: number;
  toolbarView: string;
  sidePanelWidth: number;
  settingsSection: string;
  sourceControlSection: string;
  zenMode: boolean;
  html: string;
  version: string;
}
interface LocalStorageContextData {
  storage: Accessor<Partial<StorageData>>;
  setStorage: Setter<Partial<StorageData>>;
}

const LocalStorageContext = createContext<LocalStorageContextData>();
const LocalStorageProvider: ParentComponent = (props) => {
  const [storage, setStorage] = createSignal<Partial<StorageData>>({});
  const currentVersion = "0.4";
  const defaultData: Partial<StorageData> = {
    toolbarView: "default",
    sidePanelView: "default",
    sidePanelWidth: 375,
    version: currentVersion
  };

  try {
    const storedDataString = localStorage.getItem("ui");

    if (storedDataString && storedDataString !== "{}") {
      const storedData = JSON.parse(storedDataString);

      if (storedData.version === currentVersion) {
        setStorage(storedData);
      } else {
        setStorage(defaultData);
      }
    } else {
      setStorage(defaultData);
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
