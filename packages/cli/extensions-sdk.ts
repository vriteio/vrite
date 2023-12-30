import type { Client, JSONContent, ContentPieceWithAdditionalData } from "@vrite/sdk";

/* eslint-disable no-redeclare */
/* eslint-disable func-style */
/* eslint-disable no-use-before-define */
type ContextValue = string | number | boolean | undefined | ContextObject | ContextArray;

interface ContextObject {
  [x: string]: ContextValue;
}

interface ContextArray extends Array<ContextValue> {}

interface ExtensionBaseContext {
  config: ContextObject;
  client: Omit<Client, "reconfigure">;
  token: string;
  extensionId: string;
  notify(message: { text: string; type: "success" | "error" }): void;
}
interface ExtensionBaseViewContext extends ExtensionBaseContext {}
interface ExtensionConfigurationViewContext extends ExtensionBaseViewContext {
  setConfig(key: string, value: ContextValue): void;
  setConfig(config: ContextObject): void;
}
interface ExtensionContentPieceViewContext extends ExtensionBaseViewContext {
  contentPiece: ContentPieceWithAdditionalData;
  data: ContextObject;
  setData(key: string, value: ContextValue): void;
  setData(data: ContextObject): void;
}
interface ExtensionBlockActionViewContext extends ExtensionBaseViewContext {
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
type Temp<T extends ContextValue> = Brand<"Temp"> & { [__value]: T; [__id]: string };
type Func<C extends ExtensionBaseContext | never = never> = Brand<"Func"> & {
  [__value]: (context: C) => void;
  [__id]: string;
};
interface ExtensionEnvironment {
  temp: Record<string, Temp<any>>;
  func: Record<string, Func<any>>;
  views: Record<string, View<any>>;
}
type View<C extends ExtensionBaseViewContext | never = never> = Brand<"View"> & {
  [__value]: (context: C) => ExtensionElement;
  [__id]: string;
};

interface Extension {
  generateSpec: () => Pick<
    ExtensionConfig,
    "name" | "displayName" | "description" | "permissions"
  > & {
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
  };
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
  [K in keyof P as `bind:${Exclude<K, symbol>}`]?: Temp<P[K]>;
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
}
type ExtensionElement = {
  slot: Array<ExtensionElement | string>;
  component: string;
  props?: Record<string, string | boolean | number>;
};
type Unsubscribe = () => void;
interface ExtensionConfig {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  onUninstall?: Func<ExtensionBaseContext>;
  onConfigure?: Func<ExtensionBaseContext>;
  configurationView?: View<ExtensionConfigurationViewContext>;
  contentPieceView?: View<ExtensionContentPieceViewContext>;
  blockActions?: Array<{
    id: string;
    label: string;
    blocks: string[];
    view: View<ExtensionBlockActionViewContext>;
  }>;
}

const env: ExtensionEnvironment = {
  temp: {},
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
): [Temp<T> & (() => T), (value: T) => void];
function createTemp<T extends ContextValue>(
  initialValue?: T
): [Temp<T | undefined> & (() => T | undefined), (value: T | undefined) => void];
function createTemp<T extends ContextValue>(
  initialValue?: T
): [Temp<T | undefined> & (() => T | undefined), (value: T | undefined) => void] {
  const id = `${Object.keys(env.temp).length}`;
  const temp = {
    [__id]: id,
    [__value]: initialValue
  } as Temp<T>;
  const baseGetter: () => T | undefined = () => env.temp[id][__value];
  const setter = (value: T | undefined): void => {
    env.temp[id][__value] = value;
  };

  env.temp[id] = temp;
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

  const getter = baseGetter as Temp<T> & (() => T);

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
const createExtension = (extensionConfig: ExtensionConfig): Extension => {
  return {
    generateSpec: () => {
      return {
        ...extensionConfig,
        onUninstall: extensionConfig.onUninstall?.[__id],
        onConfigure: extensionConfig.onConfigure?.[__id],
        configurationView: extensionConfig.configurationView?.[__id],
        contentPieceView: extensionConfig.contentPieceView?.[__id],
        blockActions: extensionConfig.blockActions?.map((blockAction) => ({
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
    },
    env
  };
};

export { Components, createView, createTemp, createFunction, createElement, createExtension };
