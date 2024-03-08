import type { Client, JSONContent, ContentPieceWithAdditionalData } from "../api";

/* eslint-disable no-redeclare */
/* eslint-disable func-style */
/* eslint-disable no-use-before-define */
type ContextValue = string | number | boolean | undefined | null | ContextObject | ContextArray;
type ContextObject = {
  [x: string]: ContextValue;
};
type ContextArray = Array<ContextValue>;
type IsFunction<T, R, Fallback = T> = T extends (...args: any[]) => any ? R : Fallback;
type IsObject<T, R, Fallback = T> = IsFunction<
  T,
  Fallback,
  T extends object ? (T extends any[] ? Fallback : R) : Fallback
>;
type Tail<S> = S extends `${string}.${infer T}` ? Tail<T> : S;
type Value<T> = T[keyof T];
type FlattenStepOne<T> = {
  [K in keyof T as K extends string
    ? IsObject<T[K], `${K}.${keyof T[K] & string}`, K>
    : K]: IsObject<T[K], { [key in keyof T[K]]: T[K][key] }>;
};
type FlattenStepTwo<T> = {
  [a in keyof T]: IsObject<
    T[a],
    Value<{ [M in keyof T[a] as M extends Tail<a> ? M : never]: T[a][M] }>
  >;
};
type FlattenOneLevel<T> = FlattenStepTwo<FlattenStepOne<T>>;
type Flatten<T> = T extends FlattenOneLevel<T> ? T : Flatten<FlattenOneLevel<T>>;
type UsableEnv<R extends ContextObject = ContextObject, W extends ContextObject = ContextObject> = {
  readable: R;
  writable: W;
};
type UseEnv<C extends ExtensionBaseContext> = C[typeof __usableEnv] extends UsableEnv
  ? <
      K extends
        | keyof Flatten<C[typeof __usableEnv]["readable"]>
        | keyof Flatten<C[typeof __usableEnv]["writable"]>
        | keyof C[typeof __usableEnv]["readable"]
        | keyof C[typeof __usableEnv]["writable"]
    >(
      key: K
    ) => K extends keyof Flatten<C[typeof __usableEnv]["readable"]>
      ? Val<Flatten<C[typeof __usableEnv]["readable"]>[K]>
      : K extends keyof Flatten<C[typeof __usableEnv]["writable"]>
        ? [
            Val<Flatten<C[typeof __usableEnv]["writable"]>[K]>,
            (value: Flatten<C[typeof __usableEnv]["writable"]>[K]) => void
          ]
        : K extends keyof C[typeof __usableEnv]["readable"]
          ? Val<C[typeof __usableEnv]["readable"][K]>
          : K extends keyof C[typeof __usableEnv]["writable"]
            ? [
                Val<C[typeof __usableEnv]["writable"][K]>,
                (value: C[typeof __usableEnv]["writable"][K]) => void
              ]
            : never
  : never;

interface ExtensionBaseContext<C extends ContextObject = ContextObject> {
  client: Omit<Client, "reconfigure">;
  token: string;
  extensionId: string;
  config?: C;
  spec: ExtensionSpec;
  [__usableEnv]: UsableEnv<any, any>;
  use: UseEnv<this>;
  flush(): Promise<void>;
  notify(message: { text: string; type: "success" | "error" }): Promise<void>;
}
interface ExtensionBaseViewContext<C extends ContextObject = ContextObject>
  extends ExtensionBaseContext<C> {}
interface ExtensionConfigurationViewContext<C extends ContextObject = ContextObject>
  extends ExtensionBaseViewContext<C> {
  [__usableEnv]: UsableEnv<{ [__value]: any }, { config: C }>;
}
interface ExtensionContentPieceViewContext<
  C extends ContextObject = ContextObject,
  D extends ContextObject = ContextObject
> extends ExtensionBaseViewContext<C> {
  [__usableEnv]: UsableEnv<{ contentPiece: ContentPieceWithAdditionalData }, { data: D }>;
}
interface ExtensionBlockActionViewContext<C extends ContextObject = ContextObject>
  extends ExtensionBaseViewContext<C> {
  [__usableEnv]: UsableEnv<{ content: JSONContent }, { [__value]: any }>;
  replaceContent(contentHTML: string): Promise<void>;
  refreshContent(): Promise<void>;
}
interface ExtensionElementViewContext<C extends ContextObject = ContextObject>
  extends ExtensionBaseViewContext<C> {
  [__usableEnv]: UsableEnv<{ [__value]: any }, { props: Record<string, any> }>;
  content: ExtensionElement;
}

// eslint-disable-next-line init-declarations
declare const __brand: unique symbol;
// eslint-disable-next-line init-declarations
declare const __props: unique symbol;

const __usableEnv: unique symbol = Symbol("usableEnv");
const __value: unique symbol = Symbol("value");
const __id: unique symbol = Symbol("id");
const __componentName: unique symbol = Symbol("componentName");

type Brand<B> = { [__brand]: B };
type Val<V extends ContextValue | { [K: string]: Val } = ContextValue | { [K: string]: Val }> =
  Brand<"Val"> & {
    (): V;
    [__value]: V;
    [__id]: string;
  };
type Func<C extends ExtensionBaseContext | never = never> = Brand<"Func"> & {
  (context: C): void | Promise<void>;
  [__id]: string;
};
interface ExtensionEnvironment {
  data: Record<string, Val>;
  func: Record<string, Func<any>>;
  views: Record<string, View<any>>;
  currentScope: { func: string[]; temp: string[] } | null;
}
interface ExtensionMetadata {
  __value: typeof __value;
  __id: typeof __id;
  __componentName: typeof __componentName;
  __usableEnv: typeof __usableEnv;
}
type View<C extends Partial<ExtensionBaseViewContext> | never = never> = Brand<"View"> & {
  [__value]: (context: C) => ExtensionElement | Promise<ExtensionElement>;
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
  elements?: Array<{
    type: string;
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
  ) => Promise<ExtensionElement>;
  removeScope: (id: string) => void;
  runFunction: <C extends ExtensionBaseContext | never = never>(
    id: string,
    context: C
  ) => Promise<void>;
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
  [__componentName]: string;
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
      value?: string | boolean;
      disabled: boolean;
      placeholder: string;
      optional: boolean;
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
  Card: ExtensionBaseComponent<{
    color: "base" | "contrast" | "primary";
    class: string;
  }>;
  Icon: ExtensionBaseComponent<{
    path: string;
    class: string;
  }>;
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
    when: ContextValue;
  }>;
  Show: ExtensionBaseComponent<{
    when: ContextValue;
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
  elements?: Array<{
    type: string;
    view: View<ExtensionElementViewContext<C>>;
  }>;
}

const env: ExtensionEnvironment = {
  data: {},
  func: {},
  views: {},
  currentScope: null
};
const scopes: Record<string, { func: string[]; temp: string[] }> = {};
const generateId = (): string => {
  return `_${Math.random().toString(36).substr(2, 9)}`;
};
const Components = new Proxy({} as ExtensionBaseComponents, {
  get(_, key) {
    const component = (): void => {};

    Object.defineProperty(component, __componentName, {
      value: key
    });

    return component;
  }
});

function createTemp<T extends ContextValue>(initialValue: T): [Val<T>, (value: T) => void];
function createTemp<T extends ContextValue>(
  initialValue?: T
): [Val<T | undefined>, (value: T | undefined) => void];
function createTemp<T extends ContextValue>(
  initialValue?: T
): [Val<T | undefined>, (value: T | undefined) => void] {
  if (!env.data.temp) {
    const tempVal = (() => env.data.temp[__value]) as Val<{
      [key: string]: Val<ContextValue>;
    }>;

    Object.defineProperty(tempVal, __id, {
      value: `temp`
    });
    Object.defineProperty(tempVal, __value, { value: {}, writable: true });
    env.data.temp = tempVal;
  }

  const id = generateId();
  const setter = (value: T | undefined): void => {
    const tempVal = env.data.temp as Val<{
      [key: string]: Val<ContextValue>;
    }>;

    if (tempVal[__value][id]) {
      tempVal[__value][id][__value] = value;
    }
  };
  const temp = (() => {
    const tempVal = env.data.temp as Val<{
      [key: string]: Val<ContextValue>;
    }>;

    return tempVal[__value][id]![__value];
  }) as Val<T | undefined>;

  Object.defineProperty(temp, __id, {
    value: `temp.${id}`
  });
  Object.defineProperty(temp, __value, { value: initialValue, writable: true });
  (
    env.data.temp as Val<{
      [key: string]: Val<ContextValue>;
    }>
  )[__value][id] = temp;

  if (env.currentScope) {
    env.currentScope.temp.push(id);
  }

  return [temp, setter];
}

const createFunction = <C extends ExtensionBaseContext | never = never>(
  run: (context: C) => void
): Func<C> => {
  const id = generateId();
  const func = run as Func<C>;

  Object.defineProperty(func, __id, {
    value: id
  });
  env.func[id] = func;

  if (env.currentScope) {
    env.currentScope.func.push(id);
  }

  return func;
};
const createElement = <C extends ExtensionBaseComponent<any>>(
  component: C,
  props: C[typeof __props],
  ...children: Array<ExtensionElement | string>
): ExtensionElement => {
  return {
    component: component[__componentName] || "Fragment",
    slot: children,
    props: Object.fromEntries(
      Object.keys(props || {}).map((key) => {
        const value = props[key];

        if (value && value[__id]) {
          return [key, value[__id]];
        }

        return [key, value];
      })
    )
  };
};
const createFragment = (...children: Array<ExtensionElement | string>): ExtensionElement => {
  return {
    component: "Fragment",
    slot: children,
    props: {}
  };
};
const createView = <C extends ExtensionBaseViewContext>(
  run: (context: C) => ExtensionElement
): View<C> => {
  const id = generateId();
  const view = {
    [__id]: id,
    [__value]: run
  } as View<C>;

  env.views[id] = view;

  return view;
};
const removeScope = (id: string): void => {
  const scope = scopes[id];

  if (scope) {
    scope.func.forEach((funcId) => {
      delete env.func[funcId];
    });
    scope.temp.forEach((tempId) => {
      const tempVal = env.data.temp as Val<{
        [key: string]: Val<ContextValue>;
      }>;

      if (tempVal()) {
        delete tempVal()[tempId];
      }
    });
  }
};
const createRuntime = <C extends ContextObject = ContextObject>(
  runtimeConfig: ExtensionRuntimeConfig<C>
): Extension => {
  return {
    getEnvironment: () => env,
    getMetadata: () => ({
      __value,
      __id,
      __componentName,
      __usableEnv
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
        })),
        elements: runtimeConfig.elements?.map((element) => ({
          ...element,
          view: element.view[__id]
        }))
      };
    },
    generateView: async <C extends ExtensionBaseViewContext>(id: string, context: C) => {
      const runView = env.views[id]?.[__value];

      if (runView) {
        env.currentScope = {
          func: [],
          temp: []
        };

        const element = await runView(context);

        scopes[`view:${id}`] = env.currentScope;
        env.currentScope = null;

        return element;
      }

      return {
        component: "",
        slot: []
      };
    },
    runFunction: async <C extends ExtensionBaseContext | never = never>(id: string, context: C) => {
      const runFunc = env.func[id];

      if (runFunc) {
        env.currentScope = {
          func: [],
          temp: []
        };
        await runFunc(context);
        scopes[`func:${id}`] = env.currentScope;
        env.currentScope = null;
        removeScope(`func:${id}`);
      }
    },
    removeScope
  };
};

export {
  Components,
  createView,
  createTemp,
  createFunction,
  createElement,
  createFragment,
  createRuntime
};
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
  ExtensionElementViewContext,
  ExtensionElement,
  ContextObject,
  ContextValue,
  View,
  Func,
  Val,
  Brand
};
