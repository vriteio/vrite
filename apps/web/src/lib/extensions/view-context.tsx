import {
  ContextObject,
  ContextValue,
  ExtensionBlockActionViewContext,
  ExtensionConfigurationViewContext,
  ExtensionContentPieceViewContext
} from "@vrite/sdk/extensions";
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

type ExtensionGeneralViewContext =
  | ExtensionBlockActionViewContext
  | ExtensionContentPieceViewContext
  | ExtensionConfigurationViewContext;
interface ViewContextData {
  context: Accessor<
    Omit<ExtensionGeneralViewContext, "client" | "token" | "extensionId" | "notify" | "flush">
  >;
  extension: ExtensionDetails;
  setContext: Setter<
    Omit<ExtensionGeneralViewContext, "client" | "token" | "extensionId" | "notify" | "flush">
  >;
}

const ViewContext = createContext<ViewContextData>();
const ViewContextProvider = <C extends ExtensionGeneralViewContext>(
  props: ViewContextProviderProps<
    Omit<
      C,
      | "spec"
      | "temp"
      | "config"
      | "setTemp"
      | "client"
      | "token"
      | "extensionId"
      | "notify"
      | "flush"
    >
  >
): JSX.Element => {
  const [, passedProps] = splitProps(props, ["children", "extension", "config"]);
  const [temp, setTemp] = createStore({} as ContextObject);
  const [context, setContext] = createSignal<
    Omit<ExtensionGeneralViewContext, "client" | "token" | "extensionId" | "notify" | "flush"> & {
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

  createEffect(() => {
    setContext((context) => ({
      ...context,
      config: props.config,
      spec: props.extension.spec,
      ...passedProps
    }));
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
