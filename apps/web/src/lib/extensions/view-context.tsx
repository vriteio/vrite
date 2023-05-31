import { ContextObject, ContextValue, ExtensionGeneralViewContext } from "@vrite/extensions";
import { createContext, JSX, splitProps, useContext } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { ExtensionDetails } from "#context";

type ViewContextProviderProps<O> = {
  children: JSX.Element;
  config: Record<string, any>;
  extension: ExtensionDetails;
} & O;
interface ViewContextData {
  context: Omit<ExtensionGeneralViewContext, "client" | "token" | "extensionId" | "notify">;
  extension: ExtensionDetails;
  setContext: SetStoreFunction<
    Omit<ExtensionGeneralViewContext, "client" | "token" | "extensionId" | "notify">
  >;
}

const ViewContext = createContext<ViewContextData>();
const ViewContextProvider = <C extends ExtensionGeneralViewContext>(
  props: ViewContextProviderProps<
    Omit<C, "spec" | "temp" | "config" | "setTemp" | "client" | "token" | "extensionId" | "notify">
  >
): JSX.Element => {
  const [, passedProps] = splitProps(props, ["children", "extension", "config"]);
  const [context, setContext] = createStore<
    Omit<ExtensionGeneralViewContext, "client" | "token" | "extensionId" | "notify"> & {
      methods: string[];
    }
  >({
    config: props.config,
    temp: {} as ContextObject,
    spec: props.extension.spec,
    setTemp: (keyOrObject: string | ContextObject, value?: ContextValue) => {
      if (typeof keyOrObject === "string" && typeof value !== "undefined") {
        setContext("temp", keyOrObject, value);
      } else if (typeof keyOrObject === "object") {
        setContext("temp", keyOrObject);
      }
    },
    methods: [
      "setTemp",
      ...Object.entries(passedProps)
        .filter(([, value]) => typeof value === "function")
        .map(([key]) => key)
    ],
    ...passedProps
  });

  return (
    <ViewContext.Provider value={{ extension: props.extension, context, setContext }}>
      {props.children}
    </ViewContext.Provider>
  );
};
const useViewContext = (): ViewContextData => {
  return useContext(ViewContext)!;
};

export { ViewContextProvider, useViewContext };
