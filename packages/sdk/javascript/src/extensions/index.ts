import type { Client, JSONContent, ContentPieceWithAdditionalData } from "../api";

/* eslint-disable no-redeclare */
/* eslint-disable func-style */
/* eslint-disable no-use-before-define */
type ContextValue = string | number | boolean | undefined | ContextObject | ContextArray;

interface ContextObject {
  [x: string]: ContextValue;
}

interface ContextArray extends Array<ContextValue> {}

interface ExtensionBaseContext<C extends ContextObject = ContextObject> {
  client: Omit<Client, "reconfigure">;
  token: string;
  extensionId: string;
  config: C;
  flush(): Promise<void>;
  notify(message: { text: string; type: "success" | "error" }): Promise<void>;
}
interface ExtensionBaseViewContext<C extends ContextObject = ContextObject>
  extends ExtensionBaseContext<C> {}
interface ExtensionConfigurationViewContext<C extends ContextObject = ContextObject>
  extends Omit<ExtensionBaseViewContext<C>, "config"> {
  useConfig<K extends keyof C>(key: K): [() => C[K], (value: C[K]) => void];
}
interface ExtensionContentPieceViewContext<
  C extends ContextObject = ContextObject,
  D extends ContextObject = ContextObject
> extends ExtensionBaseViewContext<C> {
  contentPiece: ContentPieceWithAdditionalData;
  useData(): [D, (value: D) => void];
}
interface ExtensionBlockActionViewContext<C extends ContextObject = ContextObject>
  extends ExtensionBaseViewContext<C> {
  content: JSONContent;
  replaceContent(contentHTML: string): void;
  refreshContent(): void;
}

// eslint-disable-next-line init-declarations
declare const __brand: unique symbol;
// eslint-disable-next-line init-declarations
declare const __props: unique symbol;

const __value: unique symbol = Symbol("value");
const __name: unique symbol = Symbol("name");
const __id: unique symbol = Symbol("id");

type Brand<B> = { [__brand]: B };
type Val<V extends ContextValue> = Brand<"Val"> & { [__value]: V; [__id]: string };
type Func<C extends ExtensionBaseContext | never = never> = Brand<"Func"> & {
  [__value]: (context: C) => void;
  [__id]: string;
};
interface ExtensionEnvironment {
  data: Partial<{ [scope: string]: Partial<{ [id: string]: Val<any> }> }>;
  func: Record<string, Func<any>>;
  views: Record<string, View<any>>;
}
interface ExtensionMetadata {
  __value: typeof __value;
  __name: typeof __name;
  __id: typeof __id;
}
type View<C extends Partial<ExtensionBaseViewContext> | never = never> = Brand<"View"> & {
  [__value]: (context: C) => ExtensionElement;
  [__id]: string;
};

interface ExtensionSpec {
  name: string;
  description: string;
  displayName: string;
  permissions: string[];
  runtime: string;
  icon: string;
  iconDark?: string;
}
interface ExtensionRuntimeSpec {
  onUninstall?: string;
  onConfigure?: string;
  configurationView?: string;
  contentPieceView?: string;
  blockActions?: Array<{
    id: string;
    label: string;
    blocks: string[];
    view: string;
  }>;
}
interface Extension {
  getMetadata: () => ExtensionMetadata;
  getEnvironment: () => ExtensionEnvironment;
  generateRuntimeSpec: () => ExtensionRuntimeSpec;
  generateView: <C extends ExtensionBaseViewContext>(
    id: string,
    context: C
  ) => ExtensionElement | void;
  runFunction: <C extends ExtensionBaseContext | never = never>(id: string, context: C) => void;
}
type BaseProps<P extends Record<string, any>> = {
  [K in keyof P as Exclude<K, symbol>]?: P[K];
};
type BindableProps<P extends Record<string, any>> = {
  [K in keyof P as `bind:${Exclude<K, symbol>}`]?: Val<P[K]>;
};
type EventProps<E extends string | never> = {
  [K in E as `on:${Exclude<K, symbol>}`]?: Func;
};
interface ExtensionBaseComponent<
  P extends Record<string, any> = Record<string, any>,
  E extends string | never = never
> {
  (props: BaseProps<P> & BindableProps<P> & EventProps<E>): void;
  [__name]: string;
  [__props]: P;
}
interface ExtensionBaseComponents {
  // Layout Components
  View: ExtensionBaseComponent<{ class: string }>;
  // UI Components
  Field: ExtensionBaseComponent<
    {
      type: string;
      color: "base" | "contrast";
      label: string;
      textarea: boolean;
      value: string | boolean;
    },
    "change"
  >;
  Tooltip: ExtensionBaseComponent<{
    text: string;
    class: string;
    fixed: boolean;
  }>;
  Button: ExtensionBaseComponent<
    {
      color: "base" | "contrast" | "primary";
      text: "base" | "contrast" | "primary" | "soft";
      class: string;
      loading: boolean;
      disabled: boolean;
    },
    "click"
  >;
  IconButton: ExtensionBaseComponent<
    {
      color: "base" | "contrast" | "primary";
      text: "base" | "contrast" | "primary" | "soft";
      path: string;
      class: string;
      loading: boolean;
      disabled: boolean;
    },
    "click"
  >;
  // Control Components
  Switch: ExtensionBaseComponent<{}>;
  Match: ExtensionBaseComponent<{
    value: ContextValue;
  }>;
  Show: ExtensionBaseComponent<{
    value: ContextValue;
  }>;
  Text: ExtensionBaseComponent<{
    content: string;
  }>;
}
type ExtensionElement = {
  slot: Array<ExtensionElement | string>;
  component: string;
  props?: Record<string, string | boolean | number>;
};
interface ExtensionRuntimeConfig<C extends ContextObject = ContextObject> {
  onUninstall?: Func<ExtensionBaseContext<C>>;
  onConfigure?: Func<ExtensionBaseContext<C>>;
  configurationView?: View<ExtensionConfigurationViewContext<C>>;
  contentPieceView?: View<ExtensionContentPieceViewContext<C>>;
  blockActions?: Array<{
    id: string;
    label: string;
    blocks: string[];
    view: View<ExtensionBlockActionViewContext<C>>;
  }>;
}

const env: ExtensionEnvironment = {
  data: {},
  func: {},
  views: {}
};
const Components = new Proxy({} as ExtensionBaseComponents, {
  get(_, key) {
    const component = (): void => {};

    Object.defineProperty(component, __name, {
      get() {
        return key;
      }
    });

    return component;
  }
});

function createTemp<T extends ContextValue>(
  initialValue: T
): [Val<T> & (() => T), (value: T) => void];
function createTemp<T extends ContextValue>(
  initialValue?: T
): [Val<T | undefined> & (() => T | undefined), (value: T | undefined) => void];
function createTemp<T extends ContextValue>(
  initialValue?: T
): [Val<T | undefined> & (() => T | undefined), (value: T | undefined) => void] {
  const id = `${Object.keys(env.data.temp || {}).length}`;
  const temp = {
    [__id]: id,
    [__value]: initialValue
  } as Val<T>;
  const baseGetter: () => T | undefined = () => env.data.temp?.[id]?.[__value];
  const setter = (value: T | undefined): void => {
    if (env.data.temp?.[id]) {
      env.data.temp[id]![__value] = value;
    }
  };

  env.data.temp = env.data.temp || {};
  env.data.temp[id] = temp;
  Object.defineProperty(baseGetter, __id, {
    get() {
      return temp[__id];
    }
  });
  Object.defineProperty(baseGetter, __value, {
    get() {
      return temp[__value];
    }
  });

  const getter = baseGetter as Val<T> & (() => T);

  return [getter, setter];
}

function createFunction<C extends ExtensionBaseContext | never = never>(
  run: (context: C) => void
): Func<C> {
  const id = `${Object.keys(env.func).length}`;
  const func = {
    [__id]: id,
    [__value]: run
  } as Func<C>;
  const baseFunc = func;

  env.func[id] = func;
  Object.defineProperty(baseFunc, __id, {
    get() {
      return id;
    }
  });
  Object.defineProperty(baseFunc, __value, {
    get() {
      return func;
    }
  });

  return baseFunc as Func<C> & (() => void);
}

const createElement = <C extends ExtensionBaseComponent<any>>(
  component: C,
  props: C[typeof __props],
  ...children: Array<ExtensionElement | string>
): ExtensionElement => {
  return {
    component: component[__name],
    slot: children,
    props: Object.fromEntries(
      Object.keys(props || {}).map((key) => {
        const value = props[key];

        if (value[__id]) {
          return [key, value[__id]];
        }

        return [key, value];
      })
    )
  };
};
const createView = <C extends ExtensionBaseViewContext>(
  run: (context: C) => ExtensionElement
): View<C> => {
  const id = `${Object.keys(env.views).length}`;
  const view = {
    [__id]: id,
    [__value]: run
  } as View<C>;

  env.views[id] = view;

  return view;
};
const createRuntime = <C extends ContextObject = ContextObject>(
  runtimeConfig: ExtensionRuntimeConfig<C>
): Extension => {
  return {
    getEnvironment: () => env,
    getMetadata: () => ({
      __value,
      __name,
      __id
    }),
    generateRuntimeSpec: () => {
      return {
        ...runtimeConfig,
        onUninstall: runtimeConfig.onUninstall?.[__id],
        onConfigure: runtimeConfig.onConfigure?.[__id],
        configurationView: runtimeConfig.configurationView?.[__id],
        contentPieceView: runtimeConfig.contentPieceView?.[__id],
        blockActions: runtimeConfig.blockActions?.map((blockAction) => ({
          ...blockAction,
          view: blockAction.view[__id]
        }))
      };
    },
    generateView: <C extends ExtensionBaseViewContext>(id: string, context: C) => {
      const runView = env.views[id]?.[__value];

      if (runView) {
        return runView(context);
      }
    },
    runFunction: <C extends ExtensionBaseContext | never = never>(id: string, context: C) => {
      const runFunc = env.func[id]?.[__value];

      if (runFunc) {
        runFunc(context);
      }
    }
  };
};

export { Components, createView, createTemp, createFunction, createElement, createRuntime };
export type {
  Extension,
  ExtensionEnvironment,
  ExtensionMetadata,
  ExtensionSpec,
  ExtensionRuntimeSpec,
  ExtensionBaseComponents,
  ExtensionBaseViewContext,
  ExtensionBaseContext,
  ExtensionBlockActionViewContext,
  ExtensionContentPieceViewContext,
  ExtensionConfigurationViewContext,
  ExtensionElement,
  ContextObject,
  ContextValue,
  View,
  Func,
  Val,
  Brand
};
