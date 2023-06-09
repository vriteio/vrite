import { ContextObject, ContextValue, ExtensionGeneralViewContext } from "@vrite/extensions";
import {
  Accessor,
  createContext,
  createEffect,
  createSignal,
  JSX,
  on,
  Setter,
  splitProps,
  useContext
} from "solid-js";
import { createStore } from "solid-js/store";
import { ExtensionDetails } from "#context";

type ViewContextProviderProps<O> = {
  children: JSX.Element;
  config: Record<string, any>;
  extension: ExtensionDetails;
} & O;
interface ViewContextData {
  context: Accessor<
    Omit<ExtensionGeneralViewContext, "client" | "token" | "extensionId" | "notify">
  >;
  extension: ExtensionDetails;
  setContext: Setter<
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
  const [temp, setTemp] = createStore({} as ContextObject);
  const [context, setContext] = createSignal<
    Omit<ExtensionGeneralViewContext, "client" | "token" | "extensionId" | "notify"> & {
      methods: string[];
    }
  >({
    config: props.config,
    temp,
    spec: props.extension.spec,
    setTemp: (keyOrObject: string | ContextObject, value?: ContextValue) => {
      if (typeof keyOrObject === "string" && typeof value !== "undefined") {
        setTemp(keyOrObject, value);
      } else if (typeof keyOrObject === "object") {
        setTemp(keyOrObject);
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

  createContext(
    on(
      () => props,
      () => {
        setContext((context) => ({
          ...context,
          config: props.config,
          spec: props.extension.spec,
          ...passedProps
        }));
      }
    )
  );

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
