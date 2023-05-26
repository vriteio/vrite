import {
  ContextObject,
  ContextValue,
  ExtensionGeneralContext,
  ExtensionSpec
} from "@vrite/extensions";
import { createContext, createEffect, JSX, on, splitProps, useContext } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";

type ViewContextProviderProps<O> = {
  children: JSX.Element;
  spec: ExtensionSpec;
  config: Record<string, any>;
} & O;
interface ViewContextData {
  context: Omit<ExtensionGeneralContext, "client">;
  setContext: SetStoreFunction<Omit<ExtensionGeneralContext, "client">>;
}

const ViewContext = createContext<ViewContextData>();
const ViewContextProvider = <C extends ExtensionGeneralContext>(
  props: ViewContextProviderProps<Omit<C, "spec" | "temp" | "config" | "setTemp" | "client">>
): JSX.Element => {
  const [, passedProps] = splitProps(props, ["children", "spec", "config"]);
  const [context, setContext] = createStore<
    Omit<ExtensionGeneralContext, "client"> & { methods: string[] }
  >({
    config: props.config,
    temp: {} as ContextObject,
    spec: props.spec,
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

  /**
   *
    setConfig(keyOrObject: string | ContextObject, value?: ContextValue) {
      if (typeof keyOrObject === "string" && typeof value !== "undefined") {
        setContext("config", keyOrObject, value);
        props.setConfig(keyOrObject, value);
      } else if (typeof keyOrObject === "object") {
        setContext("config", keyOrObject);
        props.setConfig(keyOrObject);
      }
    },
   */
  createEffect(
    on(
      () => props.config,
      (config) => {
        return setContext("config", config);
      }
    )
  );

  return (
    <ViewContext.Provider value={{ context, setContext }}>{props.children}</ViewContext.Provider>
  );
};
const useViewContext = (): ViewContextData => {
  return useContext(ViewContext)!;
};

export { ViewContextProvider, useViewContext };
